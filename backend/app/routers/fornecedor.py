from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from app.lib.auth import require_role
from app.lib.supabase import get_admin_client
from app.models.estoque import FornecedorCreate, FornecedorUpdate

router = APIRouter(prefix="/api/fornecedor", tags=["fornecedor"])


@router.get("")
def list_all(
    ativo: bool | None = Query(default=True),
    q: str | None = Query(default=None),
    user=Depends(require_role("admin")),
):
    sb = get_admin_client()
    query = sb.table("fornecedor").select("*").order("nome")
    if ativo is not None:
        query = query.eq("ativo", ativo)
    if q:
        query = query.ilike("nome", f"%{q}%")
    return query.execute().data or []


@router.post("", status_code=201)
def create(body: FornecedorCreate, user=Depends(require_role("admin"))):
    sb = get_admin_client()
    payload = body.model_dump(mode="json", exclude_none=True)
    return sb.table("fornecedor").insert(payload).execute().data[0]


@router.patch("/{fornecedor_id}")
def patch(fornecedor_id: str, body: FornecedorUpdate, user=Depends(require_role("admin"))):
    sb = get_admin_client()
    payload = body.model_dump(mode="json", exclude_none=True)
    if not payload:
        raise HTTPException(400, "nothing to update")
    sb.table("fornecedor").update(payload).eq("id", fornecedor_id).execute()
    return sb.table("fornecedor").select("*").eq("id", fornecedor_id).limit(1).execute().data[0]


@router.delete("/{fornecedor_id}")
def deactivate(fornecedor_id: str, user=Depends(require_role("admin"))):
    sb = get_admin_client()
    sb.table("fornecedor").update({"ativo": False}).eq("id", fornecedor_id).execute()
    return {"ok": True}
