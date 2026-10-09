"""Python usado para rodar os scripts Python do repo (worker de e-mail e seus testes).

Usa o venv de scripts/ (com psycopg) quando existir; senão, cai no python3 atual.
"""
import sys
from pathlib import Path

_VENV_PYTHON = Path(__file__).resolve().parent / ".venv" / "bin" / "python"


def python_dos_scripts() -> str:
    return str(_VENV_PYTHON) if _VENV_PYTHON.exists() else sys.executable
