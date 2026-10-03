#!/usr/bin/env python3
"""Sobe o dev server de um projeto do repo.

Uso:
    python3 run.py
    python3 run.py --project app_mobile
    python3 run.py -- --port 5174
"""
import argparse
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent

PROJECTS = {
    "admin-front": {"dir": REPO_ROOT / "admin-front", "script": "dev"},
    "app_mobile": {"dir": REPO_ROOT / "app_mobile", "script": "start"},
}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--project",
        choices=sorted(PROJECTS.keys()),
        default="admin-front",
        help="Projeto a rodar (padrão: admin-front)",
    )
    args, extra_args = parser.parse_known_args()

    project = PROJECTS[args.project]
    cmd = ["npm", "run", project["script"]]
    if extra_args:
        cmd += ["--", *extra_args]
    result = subprocess.run(cmd, cwd=project["dir"])
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
