from fastapi import APIRouter, Depends, HTTPException

from app.lib import repository
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
    motivo = body.get("motivo")
    if not payload:
        raise HTTPException(400, "nothing to update")
    sb = get_admin_client()

    # Se preco_unitario esta no payload, atualiza via RPC pra gerar contexto no historico.
    novo_preco = payload.pop("preco_unitario", None)
    if novo_preco is not None:
        repository.update_material_preco(
            material_id,
            float(novo_preco),
            responsavel_id=user["id"],
            motivo=motivo,
            origem="api_material",
        )

    # Outros campos seguem o caminho direto.
    if payload:
        sb.table("material").update(payload).eq("id", material_id).execute()

    return sb.table("material").select("*").eq("id", material_id).limit(1).execute().data[0]


@router.delete("/{material_id}")
def deactivate(material_id: str, user=Depends(require_role("admin"))):
    sb = get_admin_client()
    sb.table("material").update({"ativo": False}).eq("id", material_id).execute()
    return {"ok": True}


@router.get("/{material_id}/historico")
def historico(material_id: str, user=Depends(require_role("admin"))):
    """Lista historico de preco do material, mais recente primeiro.

    Faz JOIN logico com usuario_interno via segundo query (supabase-py nao
    expoe FK pra auth.users diretamente). Inclui email/nome do responsavel
    quando existe.
    """
    rows = repository.list_material_preco_historico(material_id)
    if not rows:
        return []

    # Coleta responsavel_ids unicos pra fazer um unico SELECT
    resp_ids = list({r["responsavel_id"] for r in rows if r.get("responsavel_id")})
    user_by_id: dict[str, dict] = {}
    if resp_ids:
        sb = get_admin_client()
        ui = sb.table("usuario_interno").select("id,nome").in_("id", resp_ids).execute()
        for u in ui.data or []:
            user_by_id[u["id"]] = u

    for r in rows:
        rid = r.get("responsavel_id")
        r["responsavel"] = user_by_id.get(rid) if rid else None

    return rows
