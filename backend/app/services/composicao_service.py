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
# Bandas pra overrides ficam acima da automatica:
_ORDEM_FUNDACAO = 6000
_ORDEM_PROJETO = 7000

# Cofiguracao "padrao Metalfort" para fundacao quando incluir_fundacao=true.
# Volume estimado: 10 cm de fundacao por m² de planta.
# Concreto C20 (COMP00020) é o default — validar com Samuel (ver bloco 4 de
# docs/composicoes-pendentes-revisao.md).
FUNDACAO_COMPOSICAO_CODIGO = "COMP00020"
FUNDACAO_ESPESSURA_M = 0.10  # m de espessura de fundacao por m² de planta

PROJETO_COMPOSICAO_CODIGO = "COMP00028"


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


def _expand_composicao_to_rules(
    comp: dict[str, Any],
    qtd_composicao: float,
    base_ordem: int,
    incluir_mo: bool = True,
) -> list[dict[str, Any]]:
    """Expande materiais de uma composicao em regras BOM-like."""
    rules: list[dict[str, Any]] = []
    if qtd_composicao <= 0:
        return rules
    for idx, m in enumerate(comp.get("materiais") or [], start=1):
        material = m.get("material")
        if not material or not material.get("ativo"):
            continue
        if not incluir_mo and material.get("categoria") == "servico":
            continue
        qtd_total = qtd_composicao * float(m["quantidade"])
        rules.append({
            "material_id": material["id"],
            "material": material,
            "formula_json": round(qtd_total, 4),
            "tier": "core",
            "categoria": material.get("categoria") or "outros",
            "ordem": base_ordem + idx,
            "composicao_codigo": comp.get("codigo"),
        })
    return rules


def expand_overrides_to_bom(config: dict[str, Any]) -> list[dict[str, Any]]:
    """Aplica overrides por orcamento (fundacao, projeto) gerando regras BOM-like.

    - incluir_fundacao=True -> COMP00020 (Concreto C20) com volume = area × 0,10 m
    - incluir_projeto=True com valor_projeto_override=None -> expande COMP00028
      (R$ 142 padrao). Os 6 materiais individuais entram no orcamento.
    - incluir_projeto=True com valor_projeto_override>=0 -> NAO expande COMP00028;
      caller deve adicionar uma linha extra_comercial com esse valor.
      (essa parte e tratada em routers/quote.py via overrides em config.extras_comerciais)
    """
    rules: list[dict[str, Any]] = []

    if config.get("incluir_fundacao"):
        comp = repository.get_composicao_with_materiais_by_codigo(FUNDACAO_COMPOSICAO_CODIGO)
        if comp:
            try:
                area = float(derive(config).get("area_planta_m2") or 0)
            except Exception:
                area = 0.0
            volume = area * FUNDACAO_ESPESSURA_M
            rules.extend(_expand_composicao_to_rules(comp, volume, _ORDEM_FUNDACAO))

    incluir_projeto = config.get("incluir_projeto") or False
    valor_override = config.get("valor_projeto_override")
    if incluir_projeto and valor_override is None:
        # Sem override: expande os 6 materiais da composicao normalmente
        comp = repository.get_composicao_with_materiais_by_codigo(PROJETO_COMPOSICAO_CODIGO)
        if comp:
            rules.extend(_expand_composicao_to_rules(comp, 1.0, _ORDEM_PROJETO))
    # se incluir_projeto=true e valor_override esta definido, a linha entra como
    # extra_comercial na config (caller faz isso) e os materiais do COMP00028
    # NAO sao expandidos.

    return rules
