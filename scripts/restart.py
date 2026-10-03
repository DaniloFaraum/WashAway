#!/usr/bin/env python3
"""Para os dev servers do repo (backend, admin-front, app_mobile) e sobe de novo, em background.

Sempre mata pela porta (pega o processo real, não só o wrapper `npm run` —
`tsx watch`/`expo start` deixam processo-filho órfão segurando a porta) e
também por padrão de comando, escopado ao path deste repo, pra não sobrar
processo velho rodando código antigo.

Uso:
    python3 restart.py                       # backend + admin-front + app_mobile
    python3 restart.py --project backend      # só um projeto
    python3 restart.py --skip-stop            # só sobe, sem matar o que já tá rodando
"""
import argparse
import subprocess
import sys
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent

PROJECTS = {
    "backend": {
        "dir": REPO_ROOT / "backend",
        "port": 4000,
        "pattern": "tsx watch src/server.ts",
        "pre": [["npm", "run", "docker:up"]],
        "cmd": ["npm", "run", "dev"],
        "log": Path("/tmp/washaway-backend.log"),
    },
    "admin-front": {
        "dir": REPO_ROOT / "admin-front",
        "port": 5173,
        "pattern": "vite",
        "pre": [],
        "cmd": ["npm", "run", "dev"],
        "log": Path("/tmp/washaway-admin-front.log"),
    },
    "app_mobile": {
        "dir": REPO_ROOT / "app_mobile",
        "port": 8081,
        "pattern": "expo start",
        "pre": [],
        "cmd": ["npm", "run", "web"],
        "log": Path("/tmp/washaway-app-mobile.log"),
    },
}


def kill_por_porta(porta: int) -> None:
    result = subprocess.run(["lsof", "-ti", f":{porta}"], capture_output=True, text=True)
    pids = [pid for pid in result.stdout.split() if pid]
    for pid in pids:
        subprocess.run(["kill", "-9", pid])
    if pids:
        print(f"  porta {porta}: matou {pids}")


def kill_por_padrao(padrao: str, project_dir: Path) -> None:
    # pgrep -f casa a linha de comando inteira; filtramos pelo path do projeto
    # pra nunca matar um processo parecido de outro repo/sessão.
    result = subprocess.run(["pgrep", "-f", padrao], capture_output=True, text=True)
    pids = [pid for pid in result.stdout.split() if pid]
    for pid in pids:
        cmdline = subprocess.run(["ps", "-o", "cmd=", "-p", pid], capture_output=True, text=True).stdout
        if str(project_dir) in cmdline or padrao in cmdline:
            subprocess.run(["kill", "-9", pid])


def parar(nome: str, projeto: dict) -> None:
    print(f"Parando {nome}...")
    kill_por_porta(projeto["port"])
    kill_por_padrao(projeto["pattern"], projeto["dir"])


def subir(nome: str, projeto: dict) -> None:
    for pre_cmd in projeto["pre"]:
        print(f"  {nome}: {' '.join(pre_cmd)}")
        subprocess.run(pre_cmd, cwd=projeto["dir"], check=False)

    log_path = projeto["log"]
    print(f"Subindo {nome} (log: {log_path})...")
    with open(log_path, "w") as log_file:
        subprocess.Popen(
            projeto["cmd"],
            cwd=projeto["dir"],
            stdout=log_file,
            stderr=subprocess.STDOUT,
            start_new_session=True,
        )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        "--project",
        choices=sorted(PROJECTS.keys()),
        help="Só reinicia esse projeto (padrão: os três)",
    )
    parser.add_argument(
        "--skip-stop",
        action="store_true",
        help="Não mata o que já tá rodando, só sobe de novo",
    )
    args = parser.parse_args()

    alvo = {args.project: PROJECTS[args.project]} if args.project else PROJECTS

    if not args.skip_stop:
        for nome, projeto in alvo.items():
            parar(nome, projeto)
        time.sleep(1)

    for nome, projeto in alvo.items():
        subir(nome, projeto)

    print("\nPronto. Acompanhe os logs com: tail -f /tmp/washaway-*.log")


if __name__ == "__main__":
    main()
