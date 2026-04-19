from __future__ import annotations

from app.lib.supabase import ORCAMENTOS_BUCKET, get_admin_client


def ensure_bucket() -> None:
    sb = get_admin_client()
    try:
        sb.storage.create_bucket(ORCAMENTOS_BUCKET, options={"public": False})
    except Exception:
        pass  # already exists


def upload_quote_pdf(numero: str, pdf_bytes: bytes) -> str:
    """Upload PDF and return a 30-day signed URL."""
    ensure_bucket()
    sb = get_admin_client()
    path = f"{numero}.pdf"
    sb.storage.from_(ORCAMENTOS_BUCKET).upload(
        path=path, file=pdf_bytes,
        file_options={"content-type": "application/pdf", "upsert": "true"},
    )
    signed = sb.storage.from_(ORCAMENTOS_BUCKET).create_signed_url(path, expires_in=60 * 60 * 24 * 30)
    return signed["signedURL"]
