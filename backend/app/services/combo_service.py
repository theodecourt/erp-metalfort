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


def build_combos_bom_from_selections(
    combos_selections: dict[str, str],
) -> list[dict[str, Any]]:
    """Carrega do repositorio os combos pelos slugs e converte em regras BOM sinteticas.

    Wrapper de alto-nivel sobre `calcular_itens_bom` que encapsula a busca
    no banco. Usado pelos routers que recebem `configuracao.combos`.
    """
    if not combos_selections:
        return []
    # Importacao local para evitar ciclo com modules que importam combo_service em modelos.
    from app.lib import repository

    slugs = list(combos_selections.values())
    combos_by_slug = repository.get_combos_by_slugs(slugs)
    return calcular_itens_bom(combos_selections, combos_by_slug=combos_by_slug)
