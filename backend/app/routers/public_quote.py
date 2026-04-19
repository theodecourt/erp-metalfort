from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.lib import repository
from app.lib.supabase import get_admin_client
from app.models.quote import CalculateRequest, QuoteResponse, SubmitRequest
from app.services import storage
from app.services.email_sender import send_cliente_email, send_metalfort_notification
from app.services.quote_calculator import calculate

router = APIRouter(prefix="/api/public", tags=["public"])
limiter = Limiter(key_func=get_remote_address)


@router.get("/produtos")
def list_produtos():
    return repository.list_produtos_ativos()


@router.get("/materiais")
def list_materiais():
    """Public catalogue for the 'personalizado' picker in the configurator."""
    return repository.list_materiais_ativos()


@router.get("/produto/{slug}")
def get_produto(slug: str):
    produto = repository.get_produto_by_slug(slug)
    if not produto:
        raise HTTPException(404, "Produto não encontrado")
    produto["opcoes"] = repository.list_opcoes(produto["id"])
    return produto


def _append_personalizados(bom: list[dict], config: dict) -> list[dict]:
    """Build synthetic BOM rules for the user-picked SKUs and append them."""
    itens = config.get("itens_personalizados") or []
    if not itens:
        return bom
    materiais = repository.get_materiais_by_ids([it["material_id"] for it in itens])
    extras = []
    for i, it in enumerate(itens):
        mat = materiais.get(it["material_id"])
        if not mat:
            continue
        extras.append({
            "material_id": it["material_id"],
            "material": mat,
            # formula_json as a bare number — bom_engine returns it verbatim
            "formula_json": float(it["qtd"]),
            "tier": "core",
            "categoria": "personalizado",
            "ordem": 10000 + i,
        })
    return bom + extras


@router.post("/quote/calculate", response_model=QuoteResponse)
@limiter.limit("10/minute")
def public_calculate(request: Request, req: CalculateRequest):
    bom = repository.list_bom_regras(req.produto_id)
    if not bom:
        raise HTTPException(404, "Produto sem BOM cadastrada")
    config = req.configuracao.model_dump()
    return calculate(_append_personalizados(bom, config), config, tier="core", gerenciamento_pct=8.0)


@router.post("/quote/submit")
@limiter.limit("5/minute")
def public_submit(request: Request, req: SubmitRequest):
    # Lazy import keeps module importable when WeasyPrint native deps are missing
    # (e.g. macOS dev without `brew install pango`). Fails only on actual submit.
    from app.services.pdf_generator import render_quote_pdf

    sb = get_admin_client()
    p = sb.table("produto").select("*").eq("id", req.produto_id).limit(1).execute().data
    if not p:
        raise HTTPException(404, "Produto não encontrado")
    produto = p[0]

    bom = repository.list_bom_regras(req.produto_id)
    config = req.configuracao.model_dump()
    quote = calculate(_append_personalizados(bom, config), config, tier="core", gerenciamento_pct=8.0)

    resumo_config = (
        f"{config['tamanho_modulo']} × {config['qtd_modulos']}, pé direito "
        f"{config['pe_direito_m']:.2f}m, piso {config['piso']}, WC: {'sim' if config['tem_wc'] else 'não'}"
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

    pdf_bytes = render_quote_pdf(orcamento, produto, quote["itens"], resumo_config)
    pdf_url = storage.upload_quote_pdf(orcamento["numero"], pdf_bytes)
    sb.table("orcamento").update({"pdf_url": pdf_url}).eq("id", orcamento["id"]).execute()

    send_cliente_email(
        to=req.cliente_email, cliente_nome=req.cliente_nome,
        numero=orcamento["numero"], produto_nome=produto["nome"],
        valor_total=quote["total"], pdf_bytes=pdf_bytes,
    )
    send_metalfort_notification(
        numero=orcamento["numero"], cliente_nome=req.cliente_nome,
        cliente_email=req.cliente_email, finalidade=req.finalidade,
        valor_total=quote["total"],
        admin_url=f"http://localhost:5173/admin/orcamento/{orcamento['id']}",
    )
    return {"numero": orcamento["numero"], "pdf_url": pdf_url}
