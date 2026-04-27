from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from app.lib import repository
from app.lib.auth import require_role
from app.lib.supabase import get_admin_client
from app.models.quote import CalculateRequest, SubmitRequest
from app.services.combo_service import build_combos_bom_from_selections
from app.services.configuracao_normalizer import normalize_configuracao
from app.services.personalizados import append_personalizados
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
    templates = repository.get_templates_by_slug()
    config = normalize_configuracao(req.configuracao.model_dump(), templates=templates)
    bom = repository.list_bom_regras(req.produto_id)
    combos_bom = build_combos_bom_from_selections(config.get("combos") or {})
    return calculate(
        append_personalizados(bom, config), config,
        tier=tier, gerenciamento_pct=8.0, combos_bom=combos_bom,
    )


@router.post("")
def create_internal(
    req: SubmitRequest,
    enviar_email: bool = True,
    user=Depends(require_role("admin", "vendedor")),
):
    from app.services.quote_finalize import finalize

    sb = get_admin_client()
    p = sb.table("produto").select("*").eq("id", req.produto_id).limit(1).execute().data
    if not p:
        raise HTTPException(404, "Produto não encontrado")
    produto = p[0]

    templates = repository.get_templates_by_slug()
    config = normalize_configuracao(req.configuracao.model_dump(), templates=templates)
    bom = repository.list_bom_regras(req.produto_id)
    combos_bom = build_combos_bom_from_selections(config.get("combos") or {})
    quote = calculate(
        append_personalizados(bom, config), config,
        tier="full", gerenciamento_pct=8.0, combos_bom=combos_bom,
    )

    year = datetime.utcnow().year
    payload = {
        "_year": year,
        "cliente_nome": req.cliente_nome, "cliente_email": req.cliente_email,
        "cliente_telefone": req.cliente_telefone, "produto_id": req.produto_id,
        "finalidade": req.finalidade, "configuracao_json": config,
        "tipo": "interno", "tier_aplicado": "full",
        "valor_subtotal": quote["subtotal"],
        "valor_gerenciamento_pct": quote["gerenciamento_pct"],
        "valor_total": quote["total"],
        "status": "enviado" if enviar_email else "rascunho",
        "criado_por": user["id"],
    }
    orc = repository.insert_orcamento(payload)
    repository.insert_orcamento_itens(orc["id"], [
        {k: v for k, v in it.items() if k in {
            "material_id", "descricao", "unidade", "quantidade", "preco_unitario",
            "subtotal", "tier", "categoria", "ordem",
        }} for it in quote["itens"]
    ])

    if enviar_email:
        pdf_url = finalize(
            orcamento=orc, produto=produto, itens=quote["itens"], config=config,
            cliente_nome=req.cliente_nome, cliente_email=req.cliente_email,
            finalidade=req.finalidade,
        )
        orc["pdf_url"] = pdf_url

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
