from __future__ import annotations

import base64
from datetime import datetime
from pathlib import Path
from typing import Any

import resend
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.config import settings
from app.lib import jinja_filters

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"
DEV_OUTBOX = Path("/tmp/sent")

_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html"]),
)
jinja_filters.install(_env)


def _render(tpl: str, **ctx: Any) -> str:
    return _env.get_template(tpl).render(**ctx)


def _dev_write(to: str, subject: str, body: str, attachments: list[dict] | None = None) -> None:
    DEV_OUTBOX.mkdir(parents=True, exist_ok=True)
    stamp = datetime.utcnow().strftime("%Y%m%dT%H%M%S%f")
    path = DEV_OUTBOX / f"{stamp}-{to}.eml"
    body_preview = body[:800]
    path.write_text(
        f"To: {to}\nSubject: {subject}\nAttachments: {len(attachments or [])}\n\n{body_preview}",
        encoding="utf-8",
    )


def _send(to: str, subject: str, body: str, attachments: list[dict] | None = None) -> None:
    if not settings.resend_api_key:
        _dev_write(to, subject, body, attachments)
        return
    resend.api_key = settings.resend_api_key
    params: dict[str, Any] = {
        "from": "Metalfort <orcamento@metalfort.tech>",
        "to": [to], "subject": subject, "html": body,
    }
    if attachments:
        params["attachments"] = attachments
    resend.Emails.send(params)


def send_cliente_email(*, to: str, cliente_nome: str, numero: str, produto_nome: str,
                       valor_total: float, pdf_bytes: bytes | None) -> None:
    body = _render("email_cliente.html",
        cliente_nome=cliente_nome, numero=numero,
        produto_nome=produto_nome, valor_total=valor_total)
    att: list[dict] | None = None
    if pdf_bytes is not None:
        att = [{
            "filename": f"{numero}.pdf",
            "content": base64.b64encode(pdf_bytes).decode("ascii"),
        }]
    _send(to, f"Seu orçamento Metalfort — {numero}", body, attachments=att)


def send_metalfort_notification(*, numero: str, cliente_nome: str, cliente_email: str,
                                 finalidade: str, valor_total: float, admin_url: str) -> None:
    body = _render("email_metalfort.html",
        numero=numero, cliente_nome=cliente_nome, cliente_email=cliente_email,
        finalidade=finalidade, valor_total=valor_total, admin_url=admin_url)
    _send(settings.metalfort_notification_email, f"Novo lead — {numero}", body)
