from __future__ import annotations

from typing import Any

from app.lib.supabase import get_admin_client
from app.services import storage
from app.services.email_sender import send_cliente_email, send_metalfort_notification


def _resumo(config: dict[str, Any]) -> str:
    return (
        f"{config.get('tamanho_modulo')} × {config.get('qtd_modulos')}, pé direito "
        f"{float(config.get('pe_direito_m', 0)):.2f}m, piso {config.get('piso')}, "
        f"WC: {'sim' if config.get('tem_wc') else 'não'}"
    )


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
) -> str:
    """Render the PDF, upload it, persist `pdf_url`, and fire both emails.

    Returns the signed PDF URL. Lazy-imports pdf_generator so the callers stay
    importable on machines without WeasyPrint native deps.
    """
    from app.services.pdf_generator import render_quote_pdf  # local to tolerate missing libs

    pdf_bytes = render_quote_pdf(orcamento, produto, itens, _resumo(config))
    pdf_url = storage.upload_quote_pdf(orcamento["numero"], pdf_bytes)

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
