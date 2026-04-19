from fastapi import APIRouter, Depends

from app.lib.auth import require_role
from app.lib.supabase import get_admin_client

router = APIRouter(prefix="/api/material", tags=["material"])


@router.get("")
def list_all(user=Depends(require_role("admin", "vendedor"))):
    sb = get_admin_client()
    return sb.table("material").select("*").order("categoria", desc=False).order("nome").execute().data or []


@router.post("")
def create(body: dict, user=Depends(require_role("admin"))):
    sb = get_admin_client()
    return sb.table("material").insert(body).execute().data[0]


@router.patch("/{material_id}")
def patch(material_id: str, body: dict, user=Depends(require_role("admin"))):
    sb = get_admin_client()
    sb.table("material").update(body).eq("id", material_id).execute()
    return sb.table("material").select("*").eq("id", material_id).limit(1).execute().data[0]


@router.delete("/{material_id}")
def deactivate(material_id: str, user=Depends(require_role("admin"))):
    sb = get_admin_client()
    sb.table("material").update({"ativo": False}).eq("id", material_id).execute()
    return {"ok": True}
