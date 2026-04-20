"""Converte selecoes de combos em regras BOM sinteticas consumiveis por bom_engine."""
from __future__ import annotations

from typing import Any


def calcular_itens_bom(
    selections: dict[str, str],
    *,
    combos_by_slug: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    """Dado {categoria: combo_slug} e mapa de slugs -> combo completo (com materiais),
    retorna lista de regras BOM sinteticas compativeis com quote_calculator.calculate.

    Cada regra carrega:
        material_id, material (dict), formula_json, tier ('core'), categoria (da categoria
        do combo), ordem (da material no combo, ofuscada por categoria).
    """
    rules: list[dict[str, Any]] = []
    # ordem global: cada categoria ganha um bloco de 100 posicoes para nao colidir.
    for cat_idx, (categoria, slug) in enumerate(selections.items()):
        combo = combos_by_slug.get(slug)
        if not combo:
            continue
        base_ordem = (cat_idx + 1) * 100
        for m in combo.get("materiais", []):
            rules.append({
                "material_id": m["material_id"],
                "material": m["material"],
                "formula_json": m["formula_json"],
                "tier": "core",
                "categoria": categoria,
                "combo_slug": combo["slug"],
                "ordem": base_ordem + int(m.get("ordem", 0)),
            })
    return rules
