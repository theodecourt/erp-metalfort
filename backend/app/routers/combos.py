"""Endpoints publicos de leitura: combos e templates."""
from __future__ import annotations

from fastapi import APIRouter

from app.lib import repository

router = APIRouter(prefix="/api", tags=["combos"])


@router.get("/combos")
def list_combos():
    """Lista todos os combos ativos, agrupados por categoria.

    Retorno: lista de combos com seus materiais (material + formula_json).
    Cliente usa pra montar cards e calcular Delta-vs-Standard localmente.
    """
    return repository.list_combos()


@router.get("/templates")
def list_templates():
    """Lista templates (basico, premium) com selecoes {categoria: combo_slug}."""
    return repository.list_templates()
