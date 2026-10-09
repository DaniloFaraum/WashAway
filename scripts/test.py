#!/usr/bin/env python3
"""Roda a suíte de testes de um projeto do repo, repassando caminhos como argumento.

Uso:
    python3 test.py
    python3 test.py --project app_mobile
    python3 test.py --project backend        # unit + integração (sobe o Postgres de teste)
    python3 test.py --project all            # backend, admin-front e app_mobile em sequência
    python3 test.py src/pages/Home.test.jsx
    python3 test.py --project email-worker   # worker de e-mail (unittest, usa scripts/.venv)
"""
import argparse
import subprocess
import sys
from pathlib import Path

from python_venv import python_dos_scripts

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent

PROJECTS = {
    "backend": REPO_ROOT / "backend",
    "admin-front": REPO_ROOT / "admin-front",
    "app_mobile": REPO_ROOT / "app_mobile",
}

# Projetos Python (unittest), rodados com o venv de scripts/ quando existir.
PYTHON_PROJECTS = {
    "email-worker": SCRIPT_DIR / "test_email_worker.py",
}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--project",
        choices=sorted([*PROJECTS.keys(), *PYTHON_PROJECTS.keys(), "all"]),
        default="admin-front",
        help="Projeto a testar (padrão: admin-front)",
    )
    args, test_paths = parser.parse_known_args()

    if args.project in PYTHON_PROJECTS:
        result = subprocess.run([python_dos_scripts(), str(PYTHON_PROJECTS[args.project]), *test_paths], cwd=REPO_ROOT)
        sys.exit(result.returncode)

    if args.project == "all":
        sys.exit(run_all(test_paths))

    cmd = ["npm", "run", "test"]
    if test_paths:
        cmd += ["--", *test_paths]
    result = subprocess.run(cmd, cwd=PROJECTS[args.project])
    sys.exit(result.returncode)


def run_all(test_paths: list[str]) -> int:
    """Roda `npm run test` em todos os projetos de PROJECTS e imprime um resumo."""
    if test_paths:
        print("--project all não aceita caminhos de teste; rode um projeto por vez.", file=sys.stderr)
        return 2
    resultados = {}
    for nome, cwd in PROJECTS.items():
        print(f"\n===== {nome} =====", flush=True)
        resultados[nome] = subprocess.run(["npm", "run", "test"], cwd=cwd).returncode
    print("\n===== Resumo =====")
    for nome, codigo in resultados.items():
        print(f"  {nome:<12} {'OK' if codigo == 0 else f'FALHOU (código {codigo})'}")
    return 0 if all(codigo == 0 for codigo in resultados.values()) else 1


if __name__ == "__main__":
    main()
