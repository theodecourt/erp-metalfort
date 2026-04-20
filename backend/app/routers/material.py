from fastapi import APIRouter, Depends, HTTPException

from app.lib.auth import require_role
from app.lib.supabase import get_admin_client

router = APIRouter(prefix="/api/material", tags=["material"])

_ALLOWED_FIELDS = {
    "sku", "nome", "categoria", "unidade", "preco_unitario",
    "estoque_minimo", "ativo",
}


@router.get("")
def list_all(user=Depends(require_role("admin", "vendedor"))):
    sb = get_admin_client()
    return sb.table("material").select("*").order("categoria", desc=False).order("nome").execute().data or []


@router.post("")
def create(body: dict, user=Depends(require_role("admin"))):
    payload = {k: v for k, v in body.items() if k in _ALLOWED_FIELDS}
    if "sku" not in payload or "nome" not in payload:
        raise HTTPException(400, "sku e nome são obrigatórios")
    sb = get_admin_client()

    existing = sb.table("material").select("*").eq("sku", payload["sku"]).limit(1).execute().data
    if existing:
        row = existing[0]
        if row["ativo"]:
            raise HTTPException(409, f"SKU '{payload['sku']}' já existe e está ativo")
        # Soft-deleted: reactivate, overwriting any provided fields.
        payload["ativo"] = True
        sb.table("material").update(payload).eq("id", row["id"]).execute()
        return sb.table("material").select("*").eq("id", row["id"]).limit(1).execute().data[0]

    return sb.table("material").insert(payload).execute().data[0]


@router.patch("/{material_id}")
def patch(material_id: str, body: dict, user=Depends(require_role("admin"))):
    payload = {k: v for k, v in body.items() if k in _ALLOWED_FIELDS}
    if not payload:
        raise HTTPException(400, "nothing to update")
    sb = get_admin_client()
    sb.table("material").update(payload).eq("id", material_id).execute()
    return sb.table("material").select("*").eq("id", material_id).limit(1).execute().data[0]


@router.delete("/{material_id}")
def deactivate(material_id: str, user=Depends(require_role("admin"))):
    sb = get_admin_client()
    sb.table("material").update({"ativo": False}).eq("id", material_id).execute()
    return {"ok": True}
