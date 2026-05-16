from fastapi import APIRouter, Depends, HTTPException

from app.lib.auth import require_role
from app.lib.supabase import get_admin_client

router = APIRouter(prefix="/api/produto", tags=["produto"])

# Campos que o cliente da API pode setar. Tudo fora da lista (id, created_at,
# updated_at, etc.) e ignorado para evitar mass assignment.
_ALLOWED_FIELDS = {
    "slug", "nome", "tipo_base", "finalidade", "pe_direito_sugerido_m",
    "descricao", "imagem_url", "ativo",
}
_CREATE_REQUIRED = {"slug", "nome", "tipo_base", "pe_direito_sugerido_m"}


@router.get("")
def list_all(user=Depends(require_role("admin", "vendedor"))):
    sb = get_admin_client()
    return sb.table("produto").select("*").order("nome").execute().data or []


@router.post("")
def create(body: dict, user=Depends(require_role("admin"))):
    payload = {k: v for k, v in body.items() if k in _ALLOWED_FIELDS}
    faltando = _CREATE_REQUIRED - payload.keys()
    if faltando:
        raise HTTPException(400, f"campos obrigatorios: {sorted(faltando)}")
    sb = get_admin_client()
    return sb.table("produto").insert(payload).execute().data[0]


@router.patch("/{produto_id}")
def patch(produto_id: str, body: dict, user=Depends(require_role("admin"))):
    payload = {k: v for k, v in body.items() if k in _ALLOWED_FIELDS}
    if not payload:
        raise HTTPException(400, "nothing to update")
    sb = get_admin_client()
    sb.table("produto").update(payload).eq("id", produto_id).execute()
    return sb.table("produto").select("*").eq("id", produto_id).limit(1).execute().data[0]


@router.delete("/{produto_id}")
def deactivate(produto_id: str, user=Depends(require_role("admin"))):
    sb = get_admin_client()
    sb.table("produto").update({"ativo": False}).eq("id", produto_id).execute()
    return {"ok": True}
