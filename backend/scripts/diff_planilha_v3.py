"""Compara MP-INS-MO da planilha v3 com o catálogo atual no DB.

v1 SKU = CF001SF001U001 (com Uxxx)
v3 SKU = CF001SF001 (sem Uxxx — usuário sumiu da estrutura)

Pra match: stripped = SKU sem o sufixo Uxxx.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import openpyxl

from app.lib.supabase import get_admin_client

PATH = Path(
    r"C:\Users\luc98\Documents\Hoje_atualizar\Empresas\0-STEEL\0-METALFORT"
    r"\erp-metalfort\planilhas tito\0-Samuel ORÇAMENTO PADRÃO v3.xlsx"
)


def strip_user_suffix(sku: str) -> str:
    return re.sub(r"U\d+$", "", sku)


def main() -> None:
    if not PATH.exists():
        raise SystemExit(f"Planilha nao encontrada: {PATH}")
    wb = openpyxl.load_workbook(PATH, data_only=True)
    ws = wb["MP-INS-MO"]
    rows = list(ws.iter_rows(values_only=True))

    v3_items: list[dict] = []
    for raw in rows[1:]:
        if raw[0] is None:
            continue
        sku = str(raw[0]).strip()
        if not sku:
            continue
        v3_items.append({
            "sku": sku,
            "familia": str(raw[1]).strip() if raw[1] else "",
            "familia_desc": str(raw[2]).strip() if raw[2] else "",
            "seq_desc": str(raw[4]).strip() if raw[4] else "",
            "unidade": (str(raw[5]).strip().lower() if raw[5] else ""),
            "massa": raw[6],
            "custo": raw[7],
            "fornecedor": str(raw[8]).strip() if raw[8] else "",
        })

    print(f"v3: {len(v3_items)} itens lidos")
    fams = {it["familia"] for it in v3_items}
    print(f"v3: {len(fams)} famílias diferentes — {sorted(fams)}")
    fornecedores = {it["fornecedor"] for it in v3_items if it["fornecedor"]}
    print(f"v3: {len(fornecedores)} fornecedores únicos: {sorted(fornecedores)}")

    sb = get_admin_client()
    db_rows = (
        sb.table("material").select("id, sku, nome, ativo, preco_unitario, unidade")
        .like("sku", "CF%").execute().data or []
    )
    print(f"\nDB: {len(db_rows)} materiais com prefixo CF (Samuel)")

    db_by_stripped = {strip_user_suffix(r["sku"]): r for r in db_rows}
    v3_by_sku = {it["sku"]: it for it in v3_items}

    matched: list[tuple[dict, dict]] = []
    novos: list[dict] = []
    for it in v3_items:
        if it["sku"] in db_by_stripped:
            matched.append((it, db_by_stripped[it["sku"]]))
        else:
            novos.append(it)

    sumiram = []
    for sk, r in db_by_stripped.items():
        if sk not in v3_by_sku:
            sumiram.append(r)

    print(f"\n== Diff ==")
    print(f"Match (mesmo SKU sem Uxxx): {len(matched)}")
    print(f"Novos na v3 (cadastrar):   {len(novos)}")
    print(f"Sumiram da v3 (revisar):   {len(sumiram)}")

    print(f"\n=== Match — comparação preço/nome (top 10 com mudança) ===")
    diffs_preco = []
    diffs_nome = []
    for v3, db in matched:
        try:
            preco_v3 = float(v3["custo"]) if v3["custo"] is not None else None
            preco_db = float(db.get("preco_unitario") or 0)
            if preco_v3 is not None and abs(preco_v3 - preco_db) > 0.01:
                diffs_preco.append((db["sku"], db["nome"][:40], preco_db, preco_v3))
        except Exception:
            pass
        if (db["nome"] or "").strip() != v3["seq_desc"]:
            diffs_nome.append((db["sku"], db["nome"][:40], v3["seq_desc"][:40]))
    print(f"  Diffs preço: {len(diffs_preco)} (top 10)")
    for sku, nome, pdb, pv3 in diffs_preco[:10]:
        print(f"    {sku:18} {nome:40} R$ {pdb:.2f} -> R$ {pv3:.2f}")
    print(f"  Diffs nome: {len(diffs_nome)} (top 10)")
    for sku, ndb, nv3 in diffs_nome[:10]:
        print(f"    {sku:18} {ndb:40} -> {nv3}")

    print(f"\n=== Novos na v3 (top 10) ===")
    for it in novos[:10]:
        custo = it["custo"] if it["custo"] is not None else ""
        print(f"  {it['sku']:18} {it['seq_desc'][:50]:50} | {it['unidade']:4} | R$ {custo} | fornecedor: {it['fornecedor']}")

    print(f"\n=== Sumiram (top 10) ===")
    for r in sumiram[:10]:
        print(f"  {r['sku']:18} {(r['nome'] or '')[:50]:50} ativo={r['ativo']}")


if __name__ == "__main__":
    main()
