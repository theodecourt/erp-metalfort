"""Expande composicoes vinculadas ao produto em regras BOM-like.

Cada vinculacao produto_composicao gera N regras sinteticas (uma por material
da composicao) com formula_json sendo um numero literal (qtd ja calculada).
Essas regras sao concatenadas com as do produto_bom_regra antes de chamar
o quote_calculator.calculate().

Filtra mao de obra (categoria 'servico') quando incluir_mo=False na vinculacao.
"""
from __future__ import annotations

from typing import Any

from app.lib import repository
from app.services.bom_engine import evaluate
from app.services.variables import derive

# Ordem base — composicoes ficam depois das regras BOM normais e dos combos
# pra nao mexer na ordem visual de itens existentes.
_ORDEM_BASE = 5000


def expand_composicoes_to_bom(produto_id: str, config: dict[str, Any]) -> list[dict[str, Any]]:
    """Retorna lista de regras BOM-like vindas das composicoes vinculadas."""
    pcomps = repository.list_produto_composicoes(produto_id)
    if not pcomps:
        return []

    vars_ = derive(config)
    rules: list[dict[str, Any]] = []

    for pc in pcomps:
        comp = pc.get("composicao") or {}
        if not comp.get("ativo"):
            continue
        try:
            qtd_raw = evaluate(pc["formula_json"], vars_)
            qtd_comp = float(qtd_raw) if isinstance(qtd_raw, (int, float)) else 0.0
        except Exception:
            qtd_comp = 0.0
        if qtd_comp <= 0:
            continue
        incluir_mo = pc.get("incluir_mo", True)

        for idx, m in enumerate(pc.get("materiais", []), start=1):
            material = m.get("material")
            if not material or not material.get("ativo"):
                continue
            if not incluir_mo and material.get("categoria") == "servico":
                continue
            qtd_material = float(m["quantidade"])
            qtd_total = qtd_comp * qtd_material

            rules.append({
                "material_id": material["id"],
                "material": material,
                "formula_json": round(qtd_total, 4),  # numero literal
                "tier": "core",
                "categoria": material.get("categoria") or "outros",
                "ordem": _ORDEM_BASE + (pc.get("ordem") or 0) * 100 + idx,
                "composicao_codigo": comp.get("codigo"),
            })

    return rules
