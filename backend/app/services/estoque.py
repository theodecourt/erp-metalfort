from __future__ import annotations

from decimal import Decimal
from typing import Any, Iterable

_SIGN = {
    "compra":            Decimal("1"),
    "ajuste_positivo":   Decimal("1"),
    "saida_obra":        Decimal("-1"),
    "ajuste_negativo":   Decimal("-1"),
}


def saldo_from_movimentos(movimentos: Iterable[dict[str, Any]]) -> Decimal:
    total = Decimal("0")
    for m in movimentos:
        sign = _SIGN[m["tipo"]]
        total += sign * Decimal(str(m["quantidade"]))
    return total


def montar_saldos(
    materiais: list[dict[str, Any]],
    saldos_v: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    saldo_por_mat = {str(s["material_id"]): Decimal(str(s["saldo"])) for s in saldos_v}
    out: list[dict[str, Any]] = []
    for m in materiais:
        saldo = saldo_por_mat.get(str(m["id"]), Decimal("0"))
        minimo = Decimal(str(m.get("estoque_minimo") or 0))
        abaixo = minimo > 0 and saldo < minimo
        out.append({
            "material_id": m["id"],
            "sku": m["sku"],
            "nome": m["nome"],
            "categoria": m["categoria"],
            "unidade": m["unidade"],
            "saldo": saldo,
            "estoque_minimo": minimo,
            "abaixo_minimo": abaixo,
            "preco_unitario": Decimal(str(m["preco_unitario"])),
        })
    return out


def montar_analise_fabricacao(
    orcamento: dict[str, Any],
    produto: dict[str, Any],
    itens_orc: list[dict[str, Any]],
    saldos_v: list[dict[str, Any]],
    materiais: list[dict[str, Any]],
) -> dict[str, Any]:
    saldo_por_mat = {str(s["material_id"]): Decimal(str(s["saldo"])) for s in saldos_v}
    mat_index = {str(m["id"]): m for m in materiais}

    linhas: list[dict[str, Any]] = []
    faltantes = 0
    custo_reposicao = Decimal("0")
    for it in itens_orc:
        mat = mat_index.get(str(it["material_id"]), {})
        necessario = Decimal(str(it["quantidade"]))
        saldo_atual = saldo_por_mat.get(str(it["material_id"]), Decimal("0"))
        falta = max(Decimal("0"), necessario - saldo_atual)
        status = "faltante" if falta > 0 else "suficiente"
        preco = Decimal(str(mat.get("preco_unitario", it["preco_unitario"])))
        custo_linha = (falta * preco).quantize(Decimal("0.01"))
        if status == "faltante":
            faltantes += 1
            custo_reposicao += custo_linha
        linhas.append({
            "material_id": it["material_id"],
            "sku": mat.get("sku", ""),
            "nome": it["descricao"],
            "unidade": it["unidade"],
            "necessario": necessario,
            "saldo_atual": saldo_atual,
            "falta": falta,
            "status": status,
            "preco_unitario": preco,
            "custo_reposicao_linha": custo_linha,
        })

    return {
        "orcamento_id": orcamento["id"],
        "orcamento_numero": orcamento["numero"],
        "cliente_nome": orcamento["cliente_nome"],
        "produto_nome": produto["nome"],
        "itens": linhas,
        "totais": {
            "itens_total": len(linhas),
            "itens_faltantes": faltantes,
            "custo_reposicao": custo_reposicao,
        },
    }
