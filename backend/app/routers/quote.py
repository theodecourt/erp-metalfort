from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from app.lib import repository
from app.lib.auth import require_role
from app.lib.supabase import get_admin_client
from app.models.quote import CalculateRequest, SubmitRequest
from app.services.combo_service import build_combos_bom_from_selections
from app.services.composicao_service import expand_composicoes_to_bom, expand_overrides_to_bom
from app.services.configuracao_normalizer import normalize_configuracao
from app.services.personalizados import append_personalizados
from app.services.quote_calculator import calculate

router = APIRouter(prefix="/api/quote", tags=["quote"])


@router.get("")
def list_all(user=Depends(require_role("admin", "vendedor"))):
    sb = get_admin_client()
    res = sb.table("orcamento").select("*").order("created_at", desc=True).execute()
    return res.data or []


def _validar_overrides_obrigatorios(config: dict) -> None:
    """Validacao do SUBMIT interno (POST /api/quote): exige que as 3 flags tenham
    resposta explicita (true/false). None = nao respondido = 400.

    Nao aplicar no /calculate (preview): preview precisa rodar incremental enquanto
    o usuario ainda nao decidiu, tratando None como 'nao somar' (composicao_service
    e _resolve_gerenciamento_pct ja sao tolerantes a None)."""
    if config.get("incluir_fundacao") is None:
        raise HTTPException(400, "responda 'incluir_fundacao' (true ou false)")
    if config.get("incluir_projeto") is None:
        raise HTTPException(400, "responda 'incluir_projeto' (true ou false)")
    if config.get("incluir_gerenciamento") is None:
        raise HTTPException(400, "responda 'incluir_gerenciamento' (true ou false)")


def _resolve_gerenciamento_pct(config: dict, default_pct: float = 8.0) -> float:
    """Calcula taxa de gerenciamento efetiva do orcamento.
    - incluir_gerenciamento=False -> 0
    - True com gerenciamento_pct_override definido -> override
    - True sem override -> default (8%)
    """
    if not config.get("incluir_gerenciamento"):
        return 0.0
    override = config.get("gerenciamento_pct_override")
    return float(override) if override is not None else default_pct


def _aplicar_overrides_em_extras(config: dict) -> dict:
    """Quando incluir_projeto=true e valor_projeto_override esta definido,
    adiciona uma linha em extras_comerciais com esse valor (e os materiais do
    COMP00028 nao sao expandidos — ver expand_overrides_to_bom)."""
    if not config.get("incluir_projeto"):
        return config
    valor = config.get("valor_projeto_override")
    if valor is None:
        return config
    extras = list(config.get("extras_comerciais") or [])
    extras.append({
        "descricao": "Projetos complementares (override)",
        "qtd": 1,
        "preco_unitario": float(valor),
    })
    return {**config, "extras_comerciais": extras}


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
    # Preview tolera flags None (trata como "nao somar"). Validacao obrigatoria
    # acontece so no submit (POST /api/quote).
    config = _aplicar_overrides_em_extras(config)
    bom = repository.list_bom_regras(req.produto_id)
    bom_composicoes = expand_composicoes_to_bom(req.produto_id, config)
    bom_overrides = expand_overrides_to_bom(config)
    combos_bom = build_combos_bom_from_selections(config.get("combos") or {})
    return calculate(
        append_personalizados(bom + bom_composicoes + bom_overrides, config), config,
        tier=tier, gerenciamento_pct=_resolve_gerenciamento_pct(config), combos_bom=combos_bom,
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
    _validar_overrides_obrigatorios(config)
    config = _aplicar_overrides_em_extras(config)
    bom = repository.list_bom_regras(req.produto_id)
    bom_composicoes = expand_composicoes_to_bom(req.produto_id, config)
    bom_overrides = expand_overrides_to_bom(config)
    combos_bom = build_combos_bom_from_selections(config.get("combos") or {})
    quote = calculate(
        append_personalizados(bom + bom_composicoes + bom_overrides, config), config,
        tier="full", gerenciamento_pct=_resolve_gerenciamento_pct(config), combos_bom=combos_bom,
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


@router.get("/{orcamento_id}")
def get_orcamento(
    orcamento_id: str,
    user=Depends(require_role("admin", "vendedor")),
):
    sb = get_admin_client()
    orc = sb.table("orcamento").select("*").eq("id", orcamento_id).limit(1).execute().data
    if not orc:
        raise HTTPException(404, "orçamento não encontrado")
    orcamento = orc[0]
    itens = (
        sb.table("orcamento_item")
        .select("*, material(sku, nome, unidade)")
        .eq("orcamento_id", orcamento_id)
        .order("ordem")
        .execute()
        .data
        or []
    )
    produto = (
        sb.table("produto").select("id, slug, nome").eq("id", orcamento["produto_id"]).limit(1).execute().data
        or [None]
    )[0]
    orcamento["itens"] = itens
    orcamento["produto"] = produto
    return orcamento


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
