"""Importa as 19 composicoes uteis da planilha Samuel v3 (aba COMPOSIÇÕES).

Pula 9 duplicatas "MT INS" (versao sem MO) — vao virar a flag incluir_mo
em produto_composicao em runtime. Veja docs/regras-de-negocio.md.

Mapa de modos:
  COMP00001-09  + COMP00019  -> modo='automatico'
  COMP00020-27               -> modo='opcional', default_ativo=False (fundacao)
  COMP00028                  -> modo='opcional', default_ativo=False, default_valor_override=142 (projeto)

Idempotente: upsert por codigo. Apaga composicao_material da composicao antes
de reinserir os filhos.

Uso:
  python -m scripts.import_composicoes_v3              # dry-run
  python -m scripts.import_composicoes_v3 --apply
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import openpyxl

from app.lib.supabase import get_admin_client

PATH = Path(
    r"C:\Users\luc98\Documents\Hoje_atualizar\Empresas\0-STEEL\0-METALFORT"
    r"\erp-metalfort\planilhas tito\0-Samuel ORÇAMENTO PADRÃO v3.xlsx"
)

# Composicoes a IMPORTAR (codigo, modo, default_valor_override)
SPEC: list[tuple[str, str, float | None]] = [
    *[(f"COMP0000{i}", "automatico", None) for i in range(1, 10)],   # COMP00001-09
    ("COMP00019", "automatico", None),                                # insumos LSF
    *[(f"COMP000{i}", "opcional", None) for i in range(20, 28)],     # 20-27 fundacao
    ("COMP00028", "opcional", 142.00),                                # projeto
]
SPEC_MAP = {codigo: (modo, dvo) for codigo, modo, dvo in SPEC}

UNIDADES_ERP = {"kg", "m", "m2", "m3", "pc", "cx", "und", "h", "bd", "rl", "sc",
                "ml", "ct", "l", "km", "dia"}


def parse_composicoes(path: Path) -> list[dict]:
    """Le aba COMPOSIÇÕES e retorna lista de composicoes com seus filhos."""
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb["COMPOSIÇÕES"]
    composicoes: list[dict] = []
    current: dict | None = None
    for row in ws.iter_rows(min_row=2, values_only=True):
        col0 = str(row[0]).strip() if row[0] else ""
        if col0.startswith("COMP"):
            # nova composicao
            if current is not None:
                composicoes.append(current)
            current = {
                "codigo": col0,
                "descricao": str(row[1]).strip() if row[1] else "",
                "unidade": (str(row[2]).strip().lower() if row[2] else ""),
                "custo_total_planilha": float(row[10]) if isinstance(row[10], (int, float)) else None,
                "itens": [],
            }
        else:
            # linha-filho — col 5 = SKU MP-INS-MO
            if current is None:
                continue
            sku = str(row[5]).strip() if len(row) > 5 and row[5] else ""
            if not sku:
                continue
            try:
                qtd = float(row[8]) if isinstance(row[8], (int, float)) else None
            except (TypeError, ValueError):
                qtd = None
            if qtd is None or qtd <= 0:
                continue
            current["itens"].append({
                "sku": sku,
                "descricao": str(row[6]).strip() if row[6] else "",
                "quantidade": qtd,
            })
    if current is not None:
        composicoes.append(current)
    return composicoes


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()

    if not PATH.exists():
        raise SystemExit(f"Planilha nao encontrada: {PATH}")

    composicoes = parse_composicoes(PATH)
    print(f"Lidos {len(composicoes)} composicoes brutas da planilha.")

    # Filtra so as que vamos importar
    a_importar = [c for c in composicoes if c["codigo"] in SPEC_MAP]
    pulados = [c for c in composicoes if c["codigo"] not in SPEC_MAP]
    print(f"  A importar: {len(a_importar)}")
    print(f"  Pulados (duplicatas sem MO): {len(pulados)} -> {[c['codigo'] for c in pulados]}")

    sb = get_admin_client()

    # Materiais existentes pra match por SKU
    db_mats = sb.table("material").select("id, sku, nome, preco_unitario, ativo").execute().data or []
    mat_by_sku = {m["sku"]: m for m in db_mats}
    print(f"  Catalogo: {len(db_mats)} materiais.")

    # Plano por composicao
    print()
    print(f"{'Codigo':<11} {'Modo':<11} {'Itens':>5} {'C.planilha':>11} {'C.calc':>11}  Avisos")
    print("-" * 80)
    plano = []
    for c in a_importar:
        modo, dvo = SPEC_MAP[c["codigo"]]
        unidade = c["unidade"]
        if unidade not in UNIDADES_ERP:
            print(f"{c['codigo']:<11} {modo:<11} {len(c['itens']):>5}  unidade '{unidade}' invalida -> PULAR")
            continue

        # Resolve materiais e computa custo a partir do catalogo atual
        itens_resolvidos = []
        avisos = []
        for it in c["itens"]:
            mat = mat_by_sku.get(it["sku"])
            if not mat:
                avisos.append(f"SKU '{it['sku']}' nao no catalogo")
                continue
            if not mat["ativo"]:
                avisos.append(f"SKU '{it['sku']}' inativo")
            itens_resolvidos.append({
                "material_id": mat["id"],
                "sku": mat["sku"],
                "quantidade": it["quantidade"],
                "preco_unit": float(mat["preco_unitario"]),
            })
        custo_calc = sum(x["quantidade"] * x["preco_unit"] for x in itens_resolvidos)
        custo_planilha = c["custo_total_planilha"] or 0
        diff_pct = abs(custo_calc - custo_planilha) / custo_planilha * 100 if custo_planilha else 0
        if diff_pct > 1.0:
            avisos.append(f"divergencia custo {diff_pct:.1f}%")
        avisos_str = "; ".join(avisos) if avisos else "ok"
        print(f"{c['codigo']:<11} {modo:<11} {len(itens_resolvidos):>5} {custo_planilha:>11.2f} {custo_calc:>11.2f}  {avisos_str}")

        plano.append({
            "codigo": c["codigo"],
            "descricao": c["descricao"],
            "unidade": unidade,
            "modo": modo,
            "default_valor_override": dvo,
            "itens": itens_resolvidos,
            "custo_planilha": custo_planilha,
            "custo_calc": custo_calc,
        })

    if not args.apply:
        print(f"\n[DRY-RUN] {len(plano)} composicoes prontas. Use --apply para gravar.")
        return

    print(f"\n=== APPLY ===")
    n_inserted = 0
    n_updated = 0
    n_mats = 0
    for c in plano:
        # Upsert composicao por codigo
        existing = sb.table("composicao").select("id").eq("codigo", c["codigo"]).limit(1).execute().data
        payload = {
            "codigo": c["codigo"],
            "descricao": c["descricao"],
            "unidade": c["unidade"],
            "modo": c["modo"],
            "default_ativo": False,  # nunca true por default; spec atual nao tem nada com auto-ON
            "default_valor_override": c["default_valor_override"],
            "ativo": True,
        }
        if existing:
            cid = existing[0]["id"]
            sb.table("composicao").update(payload).eq("id", cid).execute()
            n_updated += 1
            # Limpa filhos antigos
            sb.table("composicao_material").delete().eq("composicao_id", cid).execute()
        else:
            cid = sb.table("composicao").insert(payload).execute().data[0]["id"]
            n_inserted += 1
        # Insere filhos
        for ordem, it in enumerate(c["itens"], start=1):
            sb.table("composicao_material").insert({
                "composicao_id": cid,
                "material_id": it["material_id"],
                "quantidade": it["quantidade"],
                "ordem": ordem,
            }).execute()
            n_mats += 1
    print(f"Composicoes: {n_inserted} inseridas, {n_updated} atualizadas")
    print(f"Materiais vinculados: {n_mats}")


if __name__ == "__main__":
    main()
