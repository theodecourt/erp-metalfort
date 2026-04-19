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
) -> dict[str, Any]:
    vars = derive(config)
    itens: list[dict[str, Any]] = []
    subtotal = 0.0

    for regra in bom:
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

        itens.append({
            "material_id": regra["material_id"],
            "descricao": material["nome"],
            "unidade": material["unidade"],
            "quantidade": round(qty, 3),
            "preco_unitario": preco,
            "subtotal": sub,
            "tier": regra["tier"],
            "categoria": regra["categoria"],
            "ordem": regra["ordem"],
        })

    subtotal = round(subtotal, 2)
    total = round(subtotal * (1 + gerenciamento_pct / 100), 2)

    return {
        "itens": itens,
        "variaveis": vars,
        "subtotal": subtotal,
        "gerenciamento_pct": gerenciamento_pct,
        "total": total,
    }
