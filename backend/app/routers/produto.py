from fastapi import APIRouter, Depends

from app.lib.auth import require_role
from app.lib.supabase import get_admin_client

router = APIRouter(prefix="/api/produto", tags=["produto"])


@router.get("")
def list_all(user=Depends(require_role("admin", "vendedor"))):
    sb = get_admin_client()
    return sb.table("produto").select("*").order("nome").execute().data or []


@router.post("")
def create(body: dict, user=Depends(require_role("admin"))):
    sb = get_admin_client()
    return sb.table("produto").insert(body).execute().data[0]


@router.patch("/{produto_id}")
def patch(produto_id: str, body: dict, user=Depends(require_role("admin"))):
    sb = get_admin_client()
    sb.table("produto").update(body).eq("id", produto_id).execute()
    return sb.table("produto").select("*").eq("id", produto_id).limit(1).execute().data[0]


@router.delete("/{produto_id}")
def deactivate(produto_id: str, user=Depends(require_role("admin"))):
    sb = get_admin_client()
    sb.table("produto").update({"ativo": False}).eq("id", produto_id).execute()
    return {"ok": True}
