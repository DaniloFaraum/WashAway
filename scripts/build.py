#!/usr/bin/env python3
"""Roda o build de produção de um projeto do repo.

Uso:
    python3 build.py
    python3 build.py --project app_mobile
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
        help="Projeto a buildar (padrão: admin-front)",
    )
    args = parser.parse_args()

    result = subprocess.run(["npm", "run", "build"], cwd=PROJECTS[args.project])
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
