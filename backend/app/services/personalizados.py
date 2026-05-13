"""Adiciona itens personalizados (materiais do catálogo escolhidos pelo usuário)
como entradas BOM sintéticas, pra entrarem no pipeline do quote_calculator
com quantidade fixa (formula = valor literal).
"""
from __future__ import annotations

from typing import Any

from app.lib import repository


def append_personalizados(
    bom: list[dict[str, Any]],
    config: dict[str, Any],
    *,
    materiais: dict[str, dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    """Anexa itens personalizados ao BOM.

    `materiais` (opcional) e o dict {material_id: material} pre-fetchado pelo
    caller — usado nos routers que paralelizam a busca com outras queries
    independentes. Se None, busca aqui (modo legado / call sites sem paralelizacao).
    """
    itens = config.get("itens_personalizados") or []
    if not itens:
        return bom
    if materiais is None:
        materiais = repository.get_materiais_by_ids([it["material_id"] for it in itens])
    extras: list[dict[str, Any]] = []
    for i, it in enumerate(itens):
        mat = materiais.get(it["material_id"])
        if not mat:
            continue
        extras.append({
            "material_id": it["material_id"],
            "material": mat,
            "formula_json": float(it["qtd"]),
            "tier": "core",
            "categoria": "personalizado",
            "ordem": 10000 + i,
        })
    return bom + extras
