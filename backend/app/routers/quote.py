from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from app.lib import repository
from app.lib.auth import require_role
from app.lib.supabase import get_admin_client
from app.models.quote import CalculateRequest, SubmitRequest
from app.services.quote_calculator import calculate

router = APIRouter(prefix="/api/quote", tags=["quote"])


@router.get("")
def list_all(user=Depends(require_role("admin", "vendedor"))):
    sb = get_admin_client()
    res = sb.table("orcamento").select("*").order("created_at", desc=True).execute()
    return res.data or []


@router.post("/calculate")
def internal_calculate(
    req: CalculateRequest,
    tier: str = "full",
    user=Depends(require_role("admin", "vendedor")),
):
    if tier not in ("core", "full"):
        raise HTTPException(400, "tier inválido")
    bom = repository.list_bom_regras(req.produto_id)
    return calculate(bom, req.configuracao.model_dump(), tier=tier, gerenciamento_pct=8.0)


@router.post("")
def create_internal(req: SubmitRequest, user=Depends(require_role("admin", "vendedor"))):
    bom = repository.list_bom_regras(req.produto_id)
    quote = calculate(bom, req.configuracao.model_dump(), tier="full", gerenciamento_pct=8.0)
    year = datetime.utcnow().year
    payload = {
        "_year": year,
        "cliente_nome": req.cliente_nome, "cliente_email": req.cliente_email,
        "cliente_telefone": req.cliente_telefone, "produto_id": req.produto_id,
        "finalidade": req.finalidade, "configuracao_json": req.configuracao.model_dump(),
        "tipo": "interno", "tier_aplicado": "full",
        "valor_subtotal": quote["subtotal"],
        "valor_gerenciamento_pct": quote["gerenciamento_pct"],
        "valor_total": quote["total"], "status": "rascunho",
        "criado_por": user["id"],
    }
    orc = repository.insert_orcamento(payload)
    repository.insert_orcamento_itens(orc["id"], [
        {k: v for k, v in it.items() if k in {
            "material_id", "descricao", "unidade", "quantidade", "preco_unitario",
            "subtotal", "tier", "categoria", "ordem",
        }} for it in quote["itens"]
    ])
    return orc


@router.patch("/{orcamento_id}")
def patch_orcamento(
    orcamento_id: str, body: dict,
    user=Depends(require_role("admin", "vendedor")),
):
    allowed = {"status", "cliente_nome", "cliente_email", "cliente_telefone", "finalidade"}
    patch = {k: v for k, v in body.items() if k in allowed}
    if not patch:
        raise HTTPException(400, "nothing to update")
    sb = get_admin_client()
    sb.table("orcamento").update(patch).eq("id", orcamento_id).execute()
    return sb.table("orcamento").select("*").eq("id", orcamento_id).limit(1).execute().data[0]
