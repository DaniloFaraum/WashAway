#!/usr/bin/env python3
"""Gera o arquivo de doc de uma tarefa (plan/review/log) a partir do template
correspondente e já o coloca no lugar certo dentro de docs/.

- review -> docs/review/<task>.md         (destino final, pronto)
- log    -> docs/logs/<task>.md           (destino final, pronto)
- plan   -> docs/plan/<task>.md           (uma pasta ACIMA do destino final,
                                            que seria docs/plan/<task>/<arquivo>.md;
                                            o agente decide a subpasta e move)

Uso:
    python3 create_doc.py plan review-de-cadastro-veiculo
    python3 create_doc.py review review-de-cadastro-veiculo
    python3 create_doc.py log review-de-cadastro-veiculo
"""
import argparse
import datetime
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
ROOT = REPO_ROOT.parent
TEMPLATES_DIR = SCRIPT_DIR / "templates"
DOCS_DIR = ROOT / "docs"

TEMPLATE_MAP = {
    "plan": TEMPLATES_DIR / "plan_template.md",
    "review": TEMPLATES_DIR / "review_template.md",
    "log": TEMPLATES_DIR / "log_template.md",
}


def fill(content: str, task_name: str, date: str) -> str:
    return content.replace("{{TASK_NAME}}", task_name).replace("{{DATE}}", date)


def destination_for(doc_type: str, task_name: str) -> Path:
    if doc_type == "review":
        return DOCS_DIR / "review" / f"{task_name}.md"
    if doc_type == "log":
        return DOCS_DIR / "logs" / f"{task_name}.md"
    # plan: uma pasta acima do destino final (docs/plan/<task>/...)
    return DOCS_DIR / "plan" / f"{task_name}.md"


def existing_plan_subfolders() -> list[str]:
    plan_dir = DOCS_DIR / "plan"
    if not plan_dir.exists():
        return []
    return sorted(p.name for p in plan_dir.iterdir() if p.is_dir())


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("type", choices=sorted(TEMPLATE_MAP.keys()))
    parser.add_argument("task_name", help="Nome da tarefa, usado no nome do arquivo/pasta")
    args = parser.parse_args()

    template_path = TEMPLATE_MAP[args.type]
    if not template_path.exists():
        sys.exit(f"Template não encontrado: {template_path}")

    date = datetime.date.today().isoformat()
    content = fill(template_path.read_text(encoding="utf-8"), args.task_name, date)

    dest = destination_for(args.type, args.task_name)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(content, encoding="utf-8")

    print(f"Arquivo criado em: {dest}")

    subfolders = existing_plan_subfolders()
    print("Subpastas existentes em docs/plan/:")
    if subfolders:
        for name in subfolders:
            print(f"  - {name}")
    else:
        print("  (nenhuma ainda)")

    if args.type == "plan":
        print(
            "\nPróximo passo (agente): mover este arquivo para "
            f"docs/plan/<nome-da-tarefa>/ — reaproveitando uma subpasta já "
            "existente acima se for a mesma tarefa, ou criando uma nova só se "
            "for tarefa diferente — e completar o preenchimento do conteúdo."
        )
    else:
        print("\nArquivo já está no destino final. Preencha o conteúdo.")


if __name__ == "__main__":
    main()
