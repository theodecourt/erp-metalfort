from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.lib import repository
from app.lib.supabase import get_admin_client
from app.models.quote import CalculateRequest, QuoteResponse, SubmitRequest
from app.routers.quote import _run_parallel
from app.services.combo_service import build_combos_bom_from_selections
from app.services.composicao_service import expand_composicoes_to_bom
from app.services.configuracao_normalizer import normalize_configuracao
from app.services.personalizados import append_personalizados
from app.services.quote_calculator import calculate

router = APIRouter(prefix="/api/public", tags=["public"])
limiter = Limiter(key_func=get_remote_address)


@router.get("/produtos")
def list_produtos():
    return repository.list_produtos_ativos()


@router.get("/materiais")
def list_materiais():
    return repository.list_materiais_ativos()


@router.get("/produto/{slug}")
def get_produto(slug: str):
    produto = repository.get_produto_by_slug(slug)
    if not produto:
        raise HTTPException(404, "Produto não encontrado")
    produto["opcoes"] = repository.list_opcoes(produto["id"])
    return produto


@router.post("/quote/calculate", response_model=QuoteResponse)
@limiter.limit("10/minute")
def public_calculate(request: Request, req: CalculateRequest):
    templates = repository.get_templates_by_slug()
    config = normalize_configuracao(req.configuracao.model_dump(), templates=templates)
    # Cliente publico nunca decide sobre fundacao ou projeto — forcamos false
    # mesmo que o input tenha mandado outra coisa (Decisao 4 das regras).
    config["incluir_fundacao"] = False
    config["incluir_projeto"] = False
    config["valor_projeto_override"] = None
    # Cliente publico sempre paga 8% de gerenciamento — admin nao pode alterar pelo fluxo publico
    config["incluir_gerenciamento"] = True
    config["gerenciamento_pct_override"] = None

    # 3 buscas independentes em paralelo (publico nao tem overrides nem
    # itens_personalizados). 404 de "Produto sem BOM" e checado apos o batch —
    # o cliente recebe o mesmo status code; so o caminho ate la mudou.
    results = _run_parallel({
        "bom_regras": lambda: repository.list_bom_regras(req.produto_id),
        "composicoes": lambda: expand_composicoes_to_bom(req.produto_id, config),
        "combos": lambda: build_combos_bom_from_selections(config.get("combos") or {}),
    }, context="public_calculate")
    if not results["bom_regras"]:
        raise HTTPException(404, "Produto sem BOM cadastrada")

    return calculate(
        append_personalizados(results["bom_regras"] + results["composicoes"], config),
        config,
        tier="core", gerenciamento_pct=8.0, combos_bom=results["combos"],
    )


@router.post("/quote/submit")
@limiter.limit("5/minute")
def public_submit(request: Request, req: SubmitRequest):
    from app.services.quote_finalize import finalize

    sb = get_admin_client()
    p = sb.table("produto").select("*").eq("id", req.produto_id).limit(1).execute().data
    if not p:
        raise HTTPException(404, "Produto não encontrado")
    produto = p[0]

    bom = repository.list_bom_regras(req.produto_id)
    templates = repository.get_templates_by_slug()
    config = normalize_configuracao(req.configuracao.model_dump(), templates=templates)
    # Forca off no fluxo publico (mesma logica do /calculate publico).
    config["incluir_fundacao"] = False
    config["incluir_projeto"] = False
    config["valor_projeto_override"] = None
    # Cliente publico sempre paga 8% de gerenciamento — admin nao pode alterar pelo fluxo publico
    config["incluir_gerenciamento"] = True
    config["gerenciamento_pct_override"] = None
    bom_composicoes = expand_composicoes_to_bom(req.produto_id, config)
    combos_bom = build_combos_bom_from_selections(config.get("combos") or {})
    quote = calculate(
        append_personalizados(bom + bom_composicoes, config), config,
        tier="core", gerenciamento_pct=8.0, combos_bom=combos_bom,
    )

    year = datetime.utcnow().year
    payload = {
        "_year": year,
        "cliente_nome": req.cliente_nome,
        "cliente_email": req.cliente_email,
        "cliente_telefone": req.cliente_telefone,
        "produto_id": produto["id"],
        "finalidade": req.finalidade,
        "configuracao_json": config,
        "tipo": "publico",
        "tier_aplicado": "core",
        "valor_subtotal": quote["subtotal"],
        "valor_gerenciamento_pct": quote["gerenciamento_pct"],
        "valor_total": quote["total"],
        "status": "enviado",
    }
    orcamento = repository.insert_orcamento(payload)
    repository.insert_orcamento_itens(orcamento["id"], [
        {k: v for k, v in it.items() if k in {
            "material_id", "descricao", "unidade", "quantidade", "preco_unitario",
            "subtotal", "tier", "categoria", "ordem",
        }} for it in quote["itens"]
    ])

    pdf_url = finalize(
        orcamento=orcamento, produto=produto, itens=quote["itens"], config=config,
        cliente_nome=req.cliente_nome, cliente_email=req.cliente_email,
        finalidade=req.finalidade,
    )
    return {"numero": orcamento["numero"], "pdf_url": pdf_url}
