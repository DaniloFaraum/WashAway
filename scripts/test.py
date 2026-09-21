#!/usr/bin/env python3
"""Roda a suíte de testes do admin-front, repassando caminhos como argumento.

Uso:
    python3 test.py
    python3 test.py src/pages/Home.test.jsx
"""
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
ADMIN_FRONT_DIR = SCRIPT_DIR.parent / "admin-front"


def main() -> None:
    test_paths = sys.argv[1:]
    cmd = ["npm", "run", "test"]
    if test_paths:
        cmd += ["--", *test_paths]
    result = subprocess.run(cmd, cwd=ADMIN_FRONT_DIR)
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
