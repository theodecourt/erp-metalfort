"""Traduz Configuracao de forma legada (pacote_acabamento) para a nova (combos).

Idempotente: se a config ja tem `combos` populado, retorna como veio; apenas injeta
`divisoria_wc` conforme `tem_wc`.
"""
from __future__ import annotations

from copy import deepcopy
from typing import Any

# Slug fixo do combo do WC (auto-aplicado quando tem_wc=True).
WC_COMBO_SLUG = "divisoria-umida"
WC_CATEGORIA = "divisoria_wc"


def _apply_wc_rule(combos: dict[str, str], tem_wc: bool) -> dict[str, str]:
    """Garante que divisoria_wc esteja presente <=> tem_wc."""
    out = dict(combos)
    if tem_wc:
        out[WC_CATEGORIA] = WC_COMBO_SLUG
    else:
        out.pop(WC_CATEGORIA, None)
    return out


def normalize_configuracao(
    config: dict[str, Any],
    *,
    templates: dict[str, dict[str, str]],
) -> dict[str, Any]:
    """Retorna uma configuracao com `combos` e `template_aplicado` preenchidos.

    - Se `combos` ja existe e e nao-vazio, pass-through (apenas aplica WC rule).
    - Caso contrario, traduz `pacote_acabamento` (legado):
        padrao        -> template basico
        premium       -> template premium
        personalizado -> template basico (defaults)
    - Se nem `combos` nem `pacote_acabamento` estao definidos, assume basico.

    `templates` e um dict {slug: {categoria: combo_slug}}.
    """
    out = deepcopy(config)
    tem_wc = bool(out.get("tem_wc", False))

    combos = dict(out.get("combos") or {})

    if combos:
        out["combos"] = _apply_wc_rule(combos, tem_wc)
        if "template_aplicado" not in out or out.get("template_aplicado") is None:
            out["template_aplicado"] = "personalizado"
        return out

    legacy = out.get("pacote_acabamento")
    if legacy == "premium" and "premium" in templates:
        base_template = "premium"
        template_aplicado = "premium"
    elif legacy == "personalizado":
        base_template = "basico"
        template_aplicado = "personalizado"
    else:
        base_template = "basico"
        template_aplicado = "basico"

    out["combos"] = _apply_wc_rule(dict(templates[base_template]), tem_wc)
    out["template_aplicado"] = template_aplicado
    return out
