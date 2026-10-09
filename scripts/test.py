#!/usr/bin/env python3
"""Roda a suíte de testes de um projeto do repo, repassando caminhos como argumento.

Uso:
    python3 test.py
    python3 test.py --project app_mobile
    python3 test.py src/pages/Home.test.jsx
    python3 test.py --project email-worker   # worker de e-mail (unittest, usa scripts/.venv)
"""
import argparse
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent

PROJECTS = {
    "admin-front": REPO_ROOT / "admin-front",
    "app_mobile": REPO_ROOT / "app_mobile",
}

# Projetos Python (unittest), rodados com o venv de scripts/ quando existir.
PYTHON_PROJECTS = {
    "email-worker": SCRIPT_DIR / "test_email_worker.py",
}


def python_dos_scripts() -> str:
    venv = SCRIPT_DIR / ".venv" / "bin" / "python"
    return str(venv) if venv.exists() else sys.executable


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--project",
        choices=sorted([*PROJECTS.keys(), *PYTHON_PROJECTS.keys()]),
        default="admin-front",
        help="Projeto a testar (padrão: admin-front)",
    )
    args, test_paths = parser.parse_known_args()

    if args.project in PYTHON_PROJECTS:
        result = subprocess.run([python_dos_scripts(), str(PYTHON_PROJECTS[args.project]), *test_paths], cwd=REPO_ROOT)
        sys.exit(result.returncode)

    cmd = ["npm", "run", "test"]
    if test_paths:
        cmd += ["--", *test_paths]
    result = subprocess.run(cmd, cwd=PROJECTS[args.project])
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
