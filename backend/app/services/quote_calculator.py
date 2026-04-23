from __future__ import annotations

from typing import Any

from app.services.bom_engine import evaluate
from app.services.variables import derive


def calculate(
    bom: list[dict[str, Any]],
    config: dict[str, Any],
    *,
    tier: str,
    gerenciamento_pct: float,
    combos_bom: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Itera regras BOM (geometria) + regras combo (sinteticas) e gera orcamento.

    `combos_bom` e opcional; se fornecido, e uniao com `bom`. As regras combo
    carregam um campo extra `combo_slug` que e preservado em cada item gerado.
    """
    vars = derive(config)
    all_rules = list(bom)
    if combos_bom:
        all_rules.extend(combos_bom)

    # ordenacao estavel: ordem crescente; ties quebram pela categoria (alfabetico).
    all_rules.sort(key=lambda r: (int(r.get("ordem", 0)), str(r.get("categoria", ""))))

    itens: list[dict[str, Any]] = []
    subtotal = 0.0

    for regra in all_rules:
        if tier == "core" and regra["tier"] != "core":
            continue

        qty_raw = evaluate(regra["formula_json"], vars)
        qty = float(qty_raw) if isinstance(qty_raw, (int, float)) else 0.0
        if qty <= 0:
            continue

        material = regra["material"]
        preco = float(material["preco_unitario"])
        sub = round(qty * preco, 2)
        subtotal += sub

        item: dict[str, Any] = {
            "material_id": regra["material_id"],
            "descricao": material["nome"],
            "unidade": material["unidade"],
            "quantidade": round(qty, 3),
            "preco_unitario": preco,
            "subtotal": sub,
            "tier": regra["tier"],
            "categoria": regra["categoria"],
            "ordem": regra["ordem"],
        }
        if regra.get("combo_slug"):
            item["combo_slug"] = regra["combo_slug"]
        itens.append(item)

    # Extras comerciais: linhas livres (transporte, instalação, taxas...) adicionadas ao subtotal.
    # Não entram em `itens` (que representam materiais BOM/combo) — ficam num campo próprio.
    extras_cfg = config.get("extras_comerciais") or []
    extras_out: list[dict[str, Any]] = []
    for idx, ex in enumerate(extras_cfg):
        qtd = float(ex.get("qtd") or 0)
        preco = float(ex.get("preco_unitario") or 0)
        if qtd <= 0:
            continue
        sub = round(qtd * preco, 2)
        subtotal += sub
        extras_out.append({
            "descricao": str(ex.get("descricao") or "").strip(),
            "quantidade": round(qtd, 3),
            "preco_unitario": preco,
            "subtotal": sub,
            "ordem": idx,
        })

    subtotal = round(subtotal, 2)
    total = round(subtotal * (1 + gerenciamento_pct / 100), 2)

    return {
        "itens": itens,
        "extras": extras_out,
        "variaveis": vars,
        "subtotal": subtotal,
        "gerenciamento_pct": gerenciamento_pct,
        "total": total,
    }
