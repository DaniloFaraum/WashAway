#!/usr/bin/env python3
"""Testes do worker de e-mail (unittest), contra o banco de teste `washaway_test`.

Usa um transporte falso; cada teste cria eventos com destinatário único e só
processa esses (`somente_destinatarios`), para não mexer em eventos de outros
testes rodando no mesmo banco.

Uso (precisa do venv com psycopg — ver scripts/requirements.txt):
    scripts/.venv/bin/python scripts/test_email_worker.py
    python3 scripts/test.py --project email-worker
"""
from __future__ import annotations

import contextlib
import io
import subprocess
import sys
import tempfile
import threading
import unittest
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import email_worker as w  # noqa: E402

ENV = w.carregar_env()
TEST_DATABASE_URL = w.url_para_psycopg(
    ENV.get("TEST_DATABASE_URL", "postgresql://washaway:washaway@localhost:5433/washaway_test")
)


def garantir_migrations() -> None:
    """Aplica as migrations no banco de teste se a tabela ainda não existir (igual ao globalSetup do backend)."""
    with w.psycopg.connect(TEST_DATABASE_URL, autocommit=True) as conn:
        existe = conn.execute("SELECT to_regclass('public.\"EventoEmail\"')").fetchone()[0]
    if existe is None:
        subprocess.run(
            ["npx", "prisma", "migrate", "deploy"],
            cwd=w.REPO_ROOT / "backend",
            env={**ENV, "DATABASE_URL": ENV.get("TEST_DATABASE_URL", TEST_DATABASE_URL)},
            check=True,
        )


class TransporteFalso:
    def __init__(self, falhar: bool = False):
        self.falhar = falhar
        self.enviados: list[w.Email] = []

    def enviar(self, email: w.Email) -> None:
        if self.falhar:
            raise ConnectionError("servidor SMTP fora do ar")
        self.enviados.append(email)


class TransporteBloqueante(TransporteFalso):
    """Segura o envio até `liberar` ser setado (simula envio lento)."""

    def __init__(self):
        super().__init__()
        self.entrou = threading.Event()
        self.liberar = threading.Event()

    def enviar(self, email: w.Email) -> None:
        self.entrou.set()
        self.liberar.wait(timeout=10)
        super().enviar(email)


class EmailWorkerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        garantir_migrations()
        cls.config = w.Config(database_url=TEST_DATABASE_URL, max_tentativas=3, espera_base_segundos=60)
        cls.conn = w.psycopg.connect(TEST_DATABASE_URL, autocommit=True)

    @classmethod
    def tearDownClass(cls):
        cls.conn.close()

    def setUp(self):
        self.destinatario = f"worker-{uuid.uuid4().hex[:12]}@teste.washaway"

    def tearDown(self):
        self.conn.execute('DELETE FROM "EventoEmail" WHERE destinatario = %s', (self.destinatario,))

    # -- helpers ---------------------------------------------------------

    def criar_evento(self, corpo="Sua senha provisória é S3nh@-Secreta", status="pendente", tentativas=0,
                     proxima_no_passado=False) -> str:
        evento_id = f"teste{uuid.uuid4().hex[:20]}"
        self.conn.execute(
            """INSERT INTO "EventoEmail" (id, tipo, destinatario, assunto, corpo, status, tentativas, "proximaTentativaEm")
               VALUES (%s, 'teste', %s, 'Assunto', %s, %s::"StatusEventoEmail", %s,
                       CASE WHEN %s THEN (now() AT TIME ZONE 'UTC') - interval '1 minute' END)""",
            (evento_id, self.destinatario, corpo, status, tentativas, proxima_no_passado),
        )
        return evento_id

    def ler(self, evento_id: str) -> dict:
        with self.conn.cursor(row_factory=w.psycopg.rows.dict_row) as cur:
            cur.execute('SELECT * FROM "EventoEmail" WHERE id = %s', (evento_id,))
            return cur.fetchone()

    def processar(self, transporte, conn=None) -> w.Resultado:
        saida = io.StringIO()
        with contextlib.redirect_stdout(saida):
            resultado = w.processar_pendentes(conn or self.conn, transporte, self.config, [self.destinatario])
        self.ultimo_log = saida.getvalue()
        return resultado

    # -- casos -----------------------------------------------------------

    def test_marca_enviado_e_mascara_o_corpo(self):
        corpo = "Sua senha provisória é S3nh@-Secreta"
        evento_id = self.criar_evento(corpo=corpo)
        transporte = TransporteFalso()

        resultado = self.processar(transporte)

        self.assertEqual((resultado.enviados, resultado.falhas), (1, 0))
        self.assertEqual([e.corpo for e in transporte.enviados], [corpo])
        linha = self.ler(evento_id)
        self.assertEqual(linha["status"], "enviado")
        self.assertIsNotNone(linha["enviadoEm"])
        self.assertEqual(linha["corpo"], w.CORPO_MASCARADO)
        self.assertNotIn(corpo, self.ultimo_log)
        self.assertIn(evento_id, self.ultimo_log)

    def test_falha_incrementa_tentativas_grava_erro_e_tenta_de_novo_depois_da_espera(self):
        corpo = "corpo secreto da falha"
        evento_id = self.criar_evento(corpo=corpo)

        resultado = self.processar(TransporteFalso(falhar=True))

        self.assertEqual((resultado.enviados, resultado.falhas), (0, 1))
        linha = self.ler(evento_id)
        self.assertEqual(linha["status"], "erro")
        self.assertEqual(linha["tentativas"], 1)
        self.assertIn("servidor SMTP fora do ar", linha["ultimoErro"])
        self.assertIsNotNone(linha["proximaTentativaEm"])
        self.assertEqual(linha["corpo"], corpo)  # não enviado: mantém o corpo para a nova tentativa
        self.assertNotIn(corpo, self.ultimo_log)

        # Ainda dentro da espera: não tenta de novo.
        transporte = TransporteFalso()
        self.assertEqual(self.processar(transporte).enviados, 0)
        self.assertEqual(transporte.enviados, [])

        # Espera passou: nova tentativa, agora com sucesso.
        self.conn.execute(
            """UPDATE "EventoEmail" SET "proximaTentativaEm" = (now() AT TIME ZONE 'UTC') - interval '1 second'
               WHERE id = %s""",
            (evento_id,),
        )
        self.assertEqual(self.processar(transporte).enviados, 1)
        linha = self.ler(evento_id)
        self.assertEqual(linha["status"], "enviado")
        self.assertIsNone(linha["ultimoErro"])

    def test_respeita_o_limite_de_tentativas(self):
        limite = self.config.max_tentativas
        evento_id = self.criar_evento(status="erro", tentativas=limite - 1, proxima_no_passado=True)

        self.assertEqual(self.processar(TransporteFalso(falhar=True)).falhas, 1)
        linha = self.ler(evento_id)
        self.assertEqual(linha["status"], "erro")
        self.assertEqual(linha["tentativas"], limite)
        self.assertIsNone(linha["proximaTentativaEm"])
        self.assertIsNotNone(linha["ultimoErro"])

        # Erro definitivo: nunca mais é pego.
        transporte = TransporteFalso()
        self.assertEqual(self.processar(transporte).enviados, 0)
        self.assertEqual(transporte.enviados, [])

    def test_espera_crescente(self):
        self.assertEqual([w.espera_para(t, 30) for t in (1, 2, 3, 4)], [30, 60, 120, 240])

    def test_dois_workers_nao_enviam_o_mesmo_email(self):
        evento_id = self.criar_evento()
        lento = TransporteBloqueante()
        outro = TransporteFalso()

        with w.psycopg.connect(TEST_DATABASE_URL, autocommit=True) as conn_a, \
                w.psycopg.connect(TEST_DATABASE_URL, autocommit=True) as conn_b:
            thread = threading.Thread(
                target=lambda: w.processar_pendentes(conn_a, lento, self.config, [self.destinatario])
            )
            with contextlib.redirect_stdout(io.StringIO()):
                thread.start()
                self.assertTrue(lento.entrou.wait(timeout=10))
                # Worker A está com o evento travado (enviando): B não o vê.
                resultado_b = w.processar_pendentes(conn_b, outro, self.config, [self.destinatario])
                lento.liberar.set()
                thread.join(timeout=10)

        self.assertEqual(resultado_b.enviados, 0)
        self.assertEqual(outro.enviados, [])
        self.assertEqual([e.id for e in lento.enviados], [evento_id])
        self.assertEqual(self.ler(evento_id)["status"], "enviado")

    def test_cada_email_em_sua_propria_transacao(self):
        """Enquanto o 2º e-mail é enviado, o 1º já está commitado como `enviado`
        (uma falha depois não desfaz o status dele, e a trava não fica presa)."""
        primeiro = self.criar_evento()
        segundo = self.criar_evento()
        status_vistos_de_fora: list[str] = []
        teste = self

        class TransporteQueEspia(TransporteFalso):
            def enviar(self, email: w.Email) -> None:
                if self.enviados:  # 2º envio: olha o 1º por outra conexão
                    status_vistos_de_fora.append(teste.ler(self.enviados[0].id)["status"])
                super().enviar(email)

        with w.psycopg.connect(TEST_DATABASE_URL, autocommit=True) as conn_worker:
            resultado = self.processar(TransporteQueEspia(), conn=conn_worker)

        self.assertEqual(resultado.enviados, 2)
        self.assertEqual(status_vistos_de_fora, ["enviado"])
        self.assertEqual({self.ler(primeiro)["status"], self.ler(segundo)["status"]}, {"enviado"})

    def test_notify_acorda_o_worker(self):
        with w.psycopg.connect(TEST_DATABASE_URL, autocommit=True) as conn_listen:
            conn_listen.execute(f"LISTEN {w.CANAL}")
            self.assertFalse(w.esperar_notificacao(conn_listen, 0.2))
            self.conn.execute("SELECT pg_notify(%s, 'algum-id')", (w.CANAL,))
            self.assertTrue(w.esperar_notificacao(conn_listen, 5))

    def test_transporte_arquivo_grava_eml_sem_imprimir_o_corpo(self):
        with tempfile.TemporaryDirectory() as pasta:
            transporte = w.TransporteArquivo(Path(pasta))
            email = w.Email("abc123", "teste", self.destinatario, "Olá", "corpo com senha XYZ", 0)
            saida = io.StringIO()
            with contextlib.redirect_stdout(saida):
                transporte.enviar(email)

            arquivos = list(Path(pasta).glob("*-abc123.eml"))
            self.assertEqual(len(arquivos), 1)
            conteudo = arquivos[0].read_text(encoding="utf-8")
            self.assertIn("To: " + self.destinatario, conteudo)
            self.assertIn("corpo com senha XYZ", conteudo)
            self.assertIn(self.destinatario, saida.getvalue())
            self.assertNotIn("corpo com senha XYZ", saida.getvalue())

    def test_url_do_prisma_vira_url_do_libpq(self):
        self.assertEqual(
            w.url_para_psycopg("postgresql://u:p@h:5433/db?schema=public&sslmode=disable"),
            "postgresql://u:p@h:5433/db?sslmode=disable",
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
