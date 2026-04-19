from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"

_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html"]),
)


def render_quote_pdf(
    orcamento: dict[str, Any],
    produto: dict[str, Any],
    itens: list[dict[str, Any]],
    resumo_config: str,
) -> bytes:
    template = _env.get_template("quote_pdf.html")
    html = template.render(
        orcamento=orcamento,
        produto=produto,
        itens=itens,
        resumo_config=resumo_config,
        agora=datetime.utcnow().strftime("%d/%m/%Y %H:%M UTC"),
    )
    return HTML(string=html).write_pdf()
