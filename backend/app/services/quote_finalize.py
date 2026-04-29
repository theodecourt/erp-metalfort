from __future__ import annotations

import logging
from typing import Any

from app.lib.supabase import get_admin_client
from app.services import storage
from app.services.email_sender import send_cliente_email, send_metalfort_notification

logger = logging.getLogger(__name__)


def _resumo(config: dict[str, Any]) -> str:
    return (
        f"{config.get('tamanho_modulo')} × {config.get('qtd_modulos')}, pé direito "
        f"{float(config.get('pe_direito_m', 0)):.2f}m, piso {config.get('piso')}, "
        f"WC: {'sim' if config.get('tem_wc') else 'não'}"
    )


def _try_render_and_upload_pdf(
    orcamento: dict[str, Any],
    produto: dict[str, Any],
    itens: list[dict[str, Any]],
    config: dict[str, Any],
) -> tuple[bytes | None, str | None]:
    """Gera + faz upload do PDF. Retorna (pdf_bytes, pdf_url) ou (None, None) se WeasyPrint
    nao estiver disponivel no ambiente (ex.: Windows sem GTK runtime instalado).
    Em producao Linux/Mac isso roda normalmente; em dev Windows desbloqueia o submit."""
    try:
        from app.services.pdf_generator import render_quote_pdf  # lazy: pode quebrar em ambiente sem GTK
    except OSError as e:
        logger.warning("WeasyPrint indisponivel (lib nativa ausente): %s. Orcamento sera salvo sem PDF.", e)
        return None, None
    try:
        pdf_bytes = render_quote_pdf(orcamento, produto, itens, _resumo(config))
        pdf_url = storage.upload_quote_pdf(orcamento["numero"], pdf_bytes)
        return pdf_bytes, pdf_url
    except OSError as e:
        logger.warning("Falha ao gerar PDF (lib nativa): %s. Orcamento salvo sem PDF.", e)
        return None, None


def finalize(
    *,
    orcamento: dict[str, Any],
    produto: dict[str, Any],
    itens: list[dict[str, Any]],
    config: dict[str, Any],
    cliente_nome: str,
    cliente_email: str,
    finalidade: str,
    admin_base_url: str = "http://localhost:5173/admin",
) -> str | None:
    """Render the PDF (if possible), upload it, persist `pdf_url`, and fire both emails.

    Returns the signed PDF URL or None if PDF generation was skipped because of
    missing native libs in the environment. Emails are still sent — cliente
    receives email without attachment when PDF is unavailable.
    """
    pdf_bytes, pdf_url = _try_render_and_upload_pdf(orcamento, produto, itens, config)

    if pdf_url is not None:
        sb = get_admin_client()
        sb.table("orcamento").update({"pdf_url": pdf_url}).eq("id", orcamento["id"]).execute()

    send_cliente_email(
        to=cliente_email, cliente_nome=cliente_nome,
        numero=orcamento["numero"], produto_nome=produto["nome"],
        valor_total=orcamento["valor_total"], pdf_bytes=pdf_bytes,
    )
    send_metalfort_notification(
        numero=orcamento["numero"], cliente_nome=cliente_nome,
        cliente_email=cliente_email, finalidade=finalidade,
        valor_total=orcamento["valor_total"],
        admin_url=f"{admin_base_url}/orcamento/{orcamento['id']}",
    )
    return pdf_url
