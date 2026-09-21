#!/usr/bin/env python3
"""Sobe o dev server do admin-front (`npm run dev`).

Uso:
    python3 run.py
    python3 run.py -- --port 5174
"""
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
ADMIN_FRONT_DIR = SCRIPT_DIR.parent / "admin-front"


def main() -> None:
    extra_args = sys.argv[1:]
    cmd = ["npm", "run", "dev"]
    if extra_args:
        cmd += ["--", *extra_args]
    result = subprocess.run(cmd, cwd=ADMIN_FRONT_DIR)
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
