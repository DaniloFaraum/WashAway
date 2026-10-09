#!/usr/bin/env python3
"""Worker de e-mail do WashAway: envia os e-mails enfileirados pelo backend.

O backend grava cada e-mail na tabela `EventoEmail` (outbox), na mesma
transação da ação que o gerou, e faz `NOTIFY email_pendente` no commit. Este
worker escuta esse canal e, como garantia, faz uma varredura periódica dos
pendentes. Cada evento é pego com `FOR UPDATE SKIP LOCKED`, então dois workers
rodando juntos nunca enviam o mesmo e-mail.

Depois do envio, o corpo é mascarado no banco (pode conter senha gerada). O
corpo NUNCA vai para o log: só id, tipo, destinatário e status.

Transportes (EMAIL_TRANSPORTE):
    arquivo  (padrão, dev/teste) grava cada e-mail em .emails/<data>-<id>.eml
    smtp     (produção) usa SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM

Configuração por variável de ambiente; o que faltar é lido do backend/.env:
    DATABASE_URL, EMAIL_TRANSPORTE, EMAIL_PASTA (.emails, relativa ao repo),
    EMAIL_MAX_TENTATIVAS (5), EMAIL_ESPERA_BASE_SEGUNDOS (30),
    EMAIL_VARREDURA_SEGUNDOS (30), SMTP_*.

Dependência: psycopg 3 (pip install -r scripts/requirements.txt, de preferência
num venv em scripts/.venv — ver .specs/backend.specs.md).

Uso:
    python3 scripts/email_worker.py            # fica escutando (Ctrl+C para sair)
    python3 scripts/email_worker.py --uma-vez  # processa os pendentes e sai
                                               # (código ≠ 0 se algum envio falhar)
"""
from __future__ import annotations

import argparse
import os
import smtplib
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from email.message import EmailMessage
from email.utils import formatdate, make_msgid
from pathlib import Path
from typing import Protocol
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

try:
    import psycopg
except ImportError:  # pragma: no cover - só acontece sem o venv
    print(
        "psycopg não encontrado. Instale as dependências do worker:\n"
        "  python3 -m venv scripts/.venv && scripts/.venv/bin/pip install -r scripts/requirements.txt\n"
        "e rode com scripts/.venv/bin/python scripts/email_worker.py",
        file=sys.stderr,
    )
    raise

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
BACKEND_ENV = REPO_ROOT / "backend" / ".env"

CANAL = "email_pendente"
CORPO_MASCARADO = "[enviado — conteúdo removido]"
REMETENTE_PADRAO = "WashAway <nao-responda@washaway.local>"


# --------------------------------------------------------------------------
# Configuração
# --------------------------------------------------------------------------

def ler_env_arquivo(caminho: Path) -> dict[str, str]:
    """Parser mínimo de .env (KEY=valor, aspas opcionais, # comentário inteiro ou no fim da linha)."""
    valores: dict[str, str] = {}
    if not caminho.exists():
        return valores
    for linha in caminho.read_text(encoding="utf-8").splitlines():
        linha = linha.strip()
        if not linha or linha.startswith("#") or "=" not in linha:
            continue
        chave, valor = linha.split("=", 1)
        valor = valor.strip()
        if len(valor) >= 2 and valor[0] == valor[-1] and valor[0] in "\"'":
            valor = valor[1:-1]
        elif " #" in valor:  # comentário no fim da linha (sem aspas)
            valor = valor.split(" #", 1)[0].rstrip()
        valores[chave.strip()] = valor
    return valores


def carregar_env() -> dict[str, str]:
    """Variáveis do backend/.env, sobrepostas pelas do ambiente."""
    return {**ler_env_arquivo(BACKEND_ENV), **os.environ}


def url_para_psycopg(url: str) -> str:
    """Tira da URL do Prisma os parâmetros que o libpq não conhece (ex.: `schema`)."""
    partes = urlsplit(url)
    query = [(k, v) for k, v in parse_qsl(partes.query) if k not in {"schema", "connection_limit", "pool_timeout"}]
    return urlunsplit(partes._replace(query=urlencode(query)))


@dataclass
class Config:
    database_url: str
    transporte: str = "arquivo"
    pasta: Path = field(default_factory=lambda: REPO_ROOT / ".emails")
    max_tentativas: int = 5
    espera_base_segundos: int = 30
    varredura_segundos: int = 30
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""
    remetente: str = REMETENTE_PADRAO

    @classmethod
    def do_ambiente(cls, env: dict[str, str] | None = None) -> "Config":
        env = carregar_env() if env is None else env
        if not env.get("DATABASE_URL"):
            raise SystemExit("DATABASE_URL não definida (nem no ambiente, nem em backend/.env)")
        pasta = Path(env.get("EMAIL_PASTA", ".emails"))
        return cls(
            database_url=url_para_psycopg(env["DATABASE_URL"]),
            transporte=env.get("EMAIL_TRANSPORTE", "arquivo"),
            pasta=pasta if pasta.is_absolute() else REPO_ROOT / pasta,
            max_tentativas=int(env.get("EMAIL_MAX_TENTATIVAS", "5")),
            espera_base_segundos=int(env.get("EMAIL_ESPERA_BASE_SEGUNDOS", "30")),
            varredura_segundos=int(env.get("EMAIL_VARREDURA_SEGUNDOS", "30")),
            smtp_host=env.get("SMTP_HOST", ""),
            smtp_port=int(env.get("SMTP_PORT", "587")),
            smtp_user=env.get("SMTP_USER", ""),
            smtp_pass=env.get("SMTP_PASS", ""),
            remetente=env.get("SMTP_FROM") or REMETENTE_PADRAO,
        )


# --------------------------------------------------------------------------
# Transportes
# --------------------------------------------------------------------------

@dataclass
class Email:
    id: str
    tipo: str
    destinatario: str
    assunto: str
    corpo: str
    tentativas: int


class Transporte(Protocol):
    def enviar(self, email: Email) -> None: ...


def montar_mensagem(email: Email, remetente: str) -> EmailMessage:
    mensagem = EmailMessage()
    mensagem["From"] = remetente
    mensagem["To"] = email.destinatario
    mensagem["Subject"] = email.assunto
    mensagem["Date"] = formatdate(localtime=True)
    mensagem["Message-ID"] = make_msgid(idstring=email.id, domain="washaway.local")
    mensagem["X-WashAway-Evento"] = f"{email.tipo}/{email.id}"
    mensagem.set_content(email.corpo)
    return mensagem


class TransporteArquivo:
    """Dev/teste: grava o e-mail renderizado em <pasta>/<data>-<id>.eml."""

    def __init__(self, pasta: Path, remetente: str = REMETENTE_PADRAO):
        self.pasta = pasta
        self.remetente = remetente

    def enviar(self, email: Email) -> None:
        self.pasta.mkdir(parents=True, exist_ok=True)
        carimbo = datetime.now().strftime("%Y%m%d-%H%M%S")
        caminho = self.pasta / f"{carimbo}-{email.id}.eml"
        caminho.write_bytes(bytes(montar_mensagem(email, self.remetente)))
        log(f"e-mail gravado em {caminho.name} — para={email.destinatario} assunto={email.assunto!r}")


class TransporteSmtp:
    """Produção: SMTP configurado por variável de ambiente (465 = SSL, senão STARTTLS)."""

    def __init__(self, config: Config):
        if not config.smtp_host:
            raise SystemExit("EMAIL_TRANSPORTE=smtp exige SMTP_HOST")
        self.config = config

    def enviar(self, email: Email) -> None:
        cfg = self.config
        mensagem = montar_mensagem(email, cfg.remetente)
        if cfg.smtp_port == 465:
            cliente: smtplib.SMTP = smtplib.SMTP_SSL(cfg.smtp_host, cfg.smtp_port, timeout=30)
        else:
            cliente = smtplib.SMTP(cfg.smtp_host, cfg.smtp_port, timeout=30)
        with cliente:
            if cfg.smtp_port != 465:
                cliente.starttls()
            if cfg.smtp_user:
                cliente.login(cfg.smtp_user, cfg.smtp_pass)
            cliente.send_message(mensagem)


def criar_transporte(config: Config) -> Transporte:
    if config.transporte == "arquivo":
        return TransporteArquivo(config.pasta, config.remetente)
    if config.transporte == "smtp":
        return TransporteSmtp(config)
    raise SystemExit(f"EMAIL_TRANSPORTE inválido: {config.transporte!r} (use arquivo ou smtp)")


# --------------------------------------------------------------------------
# Processamento
# --------------------------------------------------------------------------

def log(mensagem: str) -> None:
    print(f"[email-worker {datetime.now().strftime('%H:%M:%S')}] {mensagem}", flush=True)


@dataclass
class Resultado:
    enviados: int = 0
    falhas: int = 0


# `criadoEm`/`proximaTentativaEm` são `timestamp` sem fuso gravados em UTC pelo
# Prisma — por isso a comparação usa now() convertido para UTC.
_SQL_SELECIONAR = """
    SELECT id, tipo::text, destinatario, assunto, corpo, tentativas
      FROM "EventoEmail"
     WHERE (status = 'pendente'
            OR (status = 'erro'
                AND tentativas < %(max)s
                AND ("proximaTentativaEm" IS NULL
                     OR "proximaTentativaEm" <= (now() AT TIME ZONE 'UTC'))))
       {filtro}
     ORDER BY "criadoEm"
     LIMIT 1
       FOR UPDATE SKIP LOCKED
"""

_SQL_ENVIADO = """
    UPDATE "EventoEmail"
       SET status = 'enviado', "enviadoEm" = (now() AT TIME ZONE 'UTC'),
           corpo = %(mascara)s, "ultimoErro" = NULL, "proximaTentativaEm" = NULL
     WHERE id = %(id)s
"""

_SQL_ERRO = """
    UPDATE "EventoEmail"
       SET status = 'erro', tentativas = %(tentativas)s, "ultimoErro" = %(erro)s,
           "proximaTentativaEm" = CASE WHEN %(espera)s::int IS NULL THEN NULL
               ELSE (now() AT TIME ZONE 'UTC') + make_interval(secs => %(espera)s::int) END
     WHERE id = %(id)s
"""


def espera_para(tentativas: int, base_segundos: int) -> int:
    """Espera crescente: base, 2×base, 4×base… depois da 1ª, 2ª, 3ª falha."""
    return base_segundos * (2 ** max(tentativas - 1, 0))


def processar_um(
    conn: "psycopg.Connection",
    transporte: Transporte,
    config: Config,
    somente_destinatarios: list[str] | None = None,
) -> bool | None:
    """Uma transação por e-mail: trava UM evento elegível, envia e atualiza.

    Transação curta de propósito: a trava fica só no e-mail sendo enviado, e um
    erro depois do envio nunca desfaz o status de outros e-mails já enviados.
    `somente_destinatarios` existe para os testes não pegarem eventos de outros
    testes no mesmo banco. Devolve True (enviado), False (falhou) ou None (nada
    elegível agora).
    """
    filtro = "AND destinatario = ANY(%(destinatarios)s)" if somente_destinatarios is not None else ""
    with conn.transaction():
        with conn.cursor() as cur:
            cur.execute(
                _SQL_SELECIONAR.format(filtro=filtro),
                {"max": config.max_tentativas, "destinatarios": somente_destinatarios},
            )
            linha = cur.fetchone()
            if linha is None:
                return None
            email = Email(*linha)

            try:
                transporte.enviar(email)
            except Exception as erro:  # noqa: BLE001 - qualquer falha de envio vira `erro`
                tentativas = email.tentativas + 1
                definitivo = tentativas >= config.max_tentativas
                cur.execute(
                    _SQL_ERRO,
                    {
                        "id": email.id,
                        "tentativas": tentativas,
                        # A mensagem da exceção vai para o banco/log; nunca o corpo.
                        "erro": f"{type(erro).__name__}: {erro}"[:1000],
                        "espera": None if definitivo else espera_para(tentativas, config.espera_base_segundos),
                    },
                )
                situacao = "erro definitivo" if definitivo else f"erro (tentativa {tentativas}/{config.max_tentativas})"
                log(f"{email.id} {email.tipo} para={email.destinatario} {situacao}: {type(erro).__name__}")
                return False

            cur.execute(_SQL_ENVIADO, {"id": email.id, "mascara": CORPO_MASCARADO})
            log(f"{email.id} {email.tipo} para={email.destinatario} enviado")
            return True


def processar_pendentes(
    conn: "psycopg.Connection",
    transporte: Transporte,
    config: Config,
    somente_destinatarios: list[str] | None = None,
) -> Resultado:
    """Processa e-mails um a um até não sobrar nenhum elegível agora.

    Termina: um e-mail que falha ganha `proximaTentativaEm` no futuro (ou vira
    erro definitivo) e deixa de ser elegível nesta passada.
    """
    total = Resultado()
    while (enviado := processar_um(conn, transporte, config, somente_destinatarios)) is not None:
        if enviado:
            total.enviados += 1
        else:
            total.falhas += 1
    return total


def esperar_notificacao(conn_listen: "psycopg.Connection", timeout: float) -> bool:
    """Bloqueia até chegar um NOTIFY no canal (True) ou o timeout passar (False)."""
    for _ in conn_listen.notifies(timeout=timeout, stop_after=1):
        return True
    return False


def conectar(config: Config, autocommit: bool = True) -> "psycopg.Connection":
    return psycopg.connect(config.database_url, autocommit=autocommit)


def rodar_continuo(config: Config, transporte: Transporte) -> None:
    log(f"escutando '{CANAL}' (transporte={config.transporte}, varredura a cada {config.varredura_segundos}s)")
    while True:
        try:
            with conectar(config) as conn, conectar(config) as conn_listen:
                conn_listen.execute(f"LISTEN {CANAL}")
                while True:
                    processar_pendentes(conn, transporte, config)
                    esperar_notificacao(conn_listen, config.varredura_segundos)
        except psycopg.OperationalError as erro:
            log(f"sem conexão com o banco ({type(erro).__name__}); tentando de novo em 5s")
            time.sleep(5)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--uma-vez", action="store_true", help="Processa os pendentes e sai")
    args = parser.parse_args()

    config = Config.do_ambiente()
    transporte = criar_transporte(config)

    if args.uma_vez:
        with conectar(config) as conn:
            resultado = processar_pendentes(conn, transporte, config)
        log(f"fim: {resultado.enviados} enviado(s), {resultado.falhas} falha(s)")
        sys.exit(1 if resultado.falhas else 0)

    try:
        rodar_continuo(config, transporte)
    except KeyboardInterrupt:
        log("encerrado")


if __name__ == "__main__":
    main()
