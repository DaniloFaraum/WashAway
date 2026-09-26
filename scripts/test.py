#!/usr/bin/env python3
"""Roda a suíte de testes de um projeto do repo, repassando caminhos como argumento.

Uso:
    python3 test.py
    python3 test.py --project app_mobile
    python3 test.py src/pages/Home.test.jsx
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


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--project",
        choices=sorted(PROJECTS.keys()),
        default="admin-front",
        help="Projeto a testar (padrão: admin-front)",
    )
    args, test_paths = parser.parse_known_args()

    cmd = ["npm", "run", "test"]
    if test_paths:
        cmd += ["--", *test_paths]
    result = subprocess.run(cmd, cwd=PROJECTS[args.project])
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
