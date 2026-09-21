#!/usr/bin/env python3
"""Roda o build de produção do admin-front (`npm run build`).

Uso:
    python3 build.py
"""
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
ADMIN_FRONT_DIR = SCRIPT_DIR.parent / "admin-front"


def main() -> None:
    result = subprocess.run(["npm", "run", "build"], cwd=ADMIN_FRONT_DIR)
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
