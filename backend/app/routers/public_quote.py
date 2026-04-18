from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.lib import repository
from app.models.quote import CalculateRequest, QuoteResponse
from app.services.quote_calculator import calculate

router = APIRouter(prefix="/api/public", tags=["public"])
limiter = Limiter(key_func=get_remote_address)


@router.get("/produtos")
def list_produtos():
    return repository.list_produtos_ativos()


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
    bom = repository.list_bom_regras(req.produto_id)
    if not bom:
        raise HTTPException(404, "Produto sem BOM cadastrada")
    return calculate(bom, req.configuracao.model_dump(), tier="core", gerenciamento_pct=8.0)
