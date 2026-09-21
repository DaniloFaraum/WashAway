#!/usr/bin/env python3
"""Gera o diff do repositório (WashAway/) contra uma branch específica.

Usado pelos commands de review e plan para ver o que mudou, com filtro
opcional por extensão (para ignorar arquivos de config, por exemplo).

Uso:
    python3 diff.py --branch main
    python3 diff.py --branch main --ignore-ext json,lock
    python3 diff.py --branch main --only-ext jsx,js
"""
import argparse
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_DIR = SCRIPT_DIR.parent


def build_pathspecs(ignore_ext: list[str], only_ext: list[str]) -> list[str]:
    if only_ext:
        return [f":(glob)*.{ext.lstrip('.')}" for ext in only_ext]
    if ignore_ext:
        return ["."] + [f":(exclude,glob)*.{ext.lstrip('.')}" for ext in ignore_ext]
    return []


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--branch", required=True, help="Branch para comparar (ex.: main)")
    parser.add_argument("--ignore-ext", help="Extensões a ignorar, separadas por vírgula (ex.: json,lock)")
    parser.add_argument("--only-ext", help="Extensões a incluir, separadas por vírgula (ex.: jsx,js)")
    args = parser.parse_args()

    if args.ignore_ext and args.only_ext:
        sys.exit("Use --ignore-ext OU --only-ext, não os dois.")

    ignore_ext = args.ignore_ext.split(",") if args.ignore_ext else []
    only_ext = args.only_ext.split(",") if args.only_ext else []
    pathspecs = build_pathspecs(ignore_ext, only_ext)

    cmd = ["git", "-C", str(REPO_DIR), "diff", args.branch]
    if pathspecs:
        cmd += ["--", *pathspecs]

    result = subprocess.run(cmd)
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
