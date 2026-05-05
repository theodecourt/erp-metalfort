"""Migra catalogo Samuel v1 -> v3.

Mudancas:
- SKU sem sufixo Uxxx (CF001SF001U001 -> CF001SF001)
- Nome perde sufixo " - 1 METRO" em alguns
- Nova familia CF013 (INSUMOS AUXILIARES)
- 41 itens novos
- 1 item desaparece (CF001SF009U001) -> apaga
- Nova coluna "Fornecedor" -> popula tabela fornecedor + material_fornecedor

Uso:
  python -m scripts.import_planilha_samuel_v3              # dry-run
  python -m scripts.import_planilha_samuel_v3 --apply
"""
from __future__ import annotations

import argparse
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import openpyxl

from app.lib.supabase import get_admin_client

DEFAULT_PLANILHA = Path(
    r"C:\Users\luc98\Documents\Hoje_atualizar\Empresas\0-STEEL\0-METALFORT"
    r"\erp-metalfort\planilhas tito\0-Samuel ORÇAMENTO PADRÃO v3.xlsx"
)
SHEET_NAME = "MP-INS-MO"

FAMILIA_PARA_CATEGORIA = {
    "CF001": "estrutura",       # PERFIL LSF
    "CF002": "servico",         # PROJETO
    "CF003": "equipamento",     # INSUMOS (ferramentas)
    "CF004": "servico",         # FRETES
    "CF005": "estrutura",       # PARAFUSOS
    "CF006": "servico",         # MÃO DE OBRA
    "CF007": "fechamento",      # AGLOMERANTES
    "CF008": "fechamento",      # PLACAS
    "CF009": "estrutura",       # ELEMENTOS ESTRUTURAIS
    "CF010": "fechamento",      # DESEMPENHO ESTRUTURAL
    "CF011": "fechamento",      # VEDAÇÕES
    "CF012": "fechamento",      # AGREGADOS
    "CF013": "instalacoes",     # INSUMOS AUXILIARES (água)
}

UNIDADES_ERP = {
    "kg", "m", "m2", "m3", "pc", "cx", "und", "h", "bd", "rl", "sc", "ml", "ct",
    "l", "km", "dia",
}
UNIDADE_MAP = {
    "kg": "kg", "un": "und", "m2": "m2", "m3": "m3", "m": "m",
    "rl": "rl", "bd": "bd", "sc": "sc", "pc": "pc",
    "l": "l", "km": "km", "dia": "dia",
}


def strip_user_suffix(sku: str) -> str:
    return re.sub(r"U\d+$", "", sku)


def parse_custo(raw) -> float | None:
    if raw is None:
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    s = str(raw).strip().replace(",", ".")
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def map_unidade(unidade_raw) -> str:
    u = (str(unidade_raw or "")).strip().lower()
    return UNIDADE_MAP.get(u, u)


def load_v3(path: Path) -> list[dict]:
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb[SHEET_NAME]
    rows = list(ws.iter_rows(values_only=True))
    items = []
    for raw in rows[1:]:
        if raw[0] is None:
            continue
        sku = str(raw[0]).strip()
        if not sku:
            continue
        familia = str(raw[1]).strip() if raw[1] else ""
        seq_desc = str(raw[4]).strip() if raw[4] else ""
        unidade = map_unidade(raw[5])
        custo = parse_custo(raw[7])
        fornecedor = str(raw[8]).strip() if raw[8] else ""
        if not seq_desc or custo is None:
            continue
        items.append({
            "sku": sku,
            "familia": familia,
            "nome": seq_desc,
            "unidade": unidade,
            "preco_unitario": custo,
            "fornecedor": fornecedor,
        })
    return items


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--planilha", default=str(DEFAULT_PLANILHA))
    args = ap.parse_args()

    items = load_v3(Path(args.planilha))
    if not items:
        print("Nenhum item valido encontrado.")
        sys.exit(1)

    sb = get_admin_client()

    # Carrega DB atual (apenas SKUs CF*)
    db_rows = (
        sb.table("material").select("id, sku, nome, ativo, preco_unitario, unidade, categoria")
        .like("sku", "CF%").execute().data or []
    )
    db_by_stripped = {strip_user_suffix(r["sku"]): r for r in db_rows}
    v3_by_sku = {it["sku"]: it for it in items}

    # Plano de acoes
    rename: list[tuple[dict, dict]] = []
    update_only: list[tuple[dict, dict]] = []
    insert: list[dict] = []
    apagar: list[dict] = []

    for it in items:
        cat = FAMILIA_PARA_CATEGORIA.get(it["familia"])
        if cat is None:
            print(f"AVISO: familia '{it['familia']}' sem mapeamento — pulando {it['sku']}")
            continue
        if it["unidade"] not in UNIDADES_ERP:
            print(f"AVISO: unidade '{it['unidade']}' invalida — pulando {it['sku']}")
            continue
        it["categoria"] = cat
        if it["sku"] in db_by_stripped:
            db = db_by_stripped[it["sku"]]
            if db["sku"] != it["sku"]:
                rename.append((it, db))
            else:
                # Mesmo SKU já — só verificar se precisa update de outros campos
                update_only.append((it, db))
        else:
            insert.append(it)

    # Detecta os que sumiram
    for sk, r in db_by_stripped.items():
        if sk not in v3_by_sku:
            apagar.append(r)

    # Fornecedores únicos da v3
    fornecedores_set = {it["fornecedor"] for it in items if it["fornecedor"]}
    db_fornecedores = sb.table("fornecedor").select("id, nome").execute().data or []
    db_fornecedor_by_nome = {(f["nome"] or "").strip().upper(): f for f in db_fornecedores}
    fornecedores_criar = [
        f for f in fornecedores_set if f.upper() not in db_fornecedor_by_nome
    ]

    # Vinculos material_fornecedor (só pra os que tem fornecedor preenchido)
    aliases_count = sum(1 for it in items if it["fornecedor"])

    # Sumario
    print("\n=== Plano v3 ===")
    print(f"Total v3: {len(items)} | DB CF*: {len(db_rows)}")
    print(f"  Renomear (Uxxx -> sem):     {len(rename)}")
    print(f"  Atualizar nome/preco/cat:   {len(update_only)}")
    print(f"  Inserir novos:              {len(insert)}")
    print(f"  Apagar (sumiram da v3):     {len(apagar)}")
    print(f"  Fornecedores novos:         {len(fornecedores_criar)} -> {fornecedores_criar}")
    print(f"  Vinculos material_fornec.:  {aliases_count}")

    if rename[:5]:
        print("\n  Exemplo renames (5 primeiros):")
        for v3, db in rename[:5]:
            print(f"    {db['sku']} -> {v3['sku']}    (nome: {(db['nome'] or '')[:30]})")
    if insert[:5]:
        print("\n  Exemplo novos (5 primeiros):")
        for it in insert[:5]:
            print(f"    {it['sku']:14} {it['nome'][:40]:40} | {it['categoria']:12} | {it['unidade']:4} | R$ {it['preco_unitario']}")
    if apagar:
        print("\n  Apagar:")
        for r in apagar:
            print(f"    {r['sku']:18} {(r['nome'] or '')[:50]}")

    if not args.apply:
        print("\n[DRY-RUN] Para aplicar, rode com --apply")
        return

    print("\n=== APPLY ===")

    # 1. Cria fornecedores novos
    fornecedor_id_by_nome: dict[str, str] = {
        (f["nome"] or "").strip().upper(): f["id"] for f in db_fornecedores
    }
    for nome in fornecedores_criar:
        new_f = sb.table("fornecedor").insert({"nome": nome, "ativo": True}).execute().data[0]
        fornecedor_id_by_nome[nome.upper()] = new_f["id"]
        print(f"  + fornecedor: {nome}")

    # 2. Apaga sumidos
    for r in apagar:
        # Tenta DELETE; se houver FK, soft-delete
        try:
            sb.table("material").delete().eq("id", r["id"]).execute()
            print(f"  - apagado: {r['sku']}")
        except Exception:
            sb.table("material").update({"ativo": False}).eq("id", r["id"]).execute()
            print(f"  - desativado (FK): {r['sku']}")

    # 3. Renomear (e atualizar nome/preco se diferente)
    for v3, db in rename:
        payload = {
            "sku": v3["sku"],
            "nome": v3["nome"],
            "categoria": v3["categoria"],
            "unidade": v3["unidade"],
            "preco_unitario": v3["preco_unitario"],
            "ativo": True,
        }
        sb.table("material").update(payload).eq("id", db["id"]).execute()
    print(f"  ~ {len(rename)} renomeados/atualizados")

    # 4. Atualizar (mesmos SKUs)
    for v3, db in update_only:
        payload = {
            "nome": v3["nome"],
            "categoria": v3["categoria"],
            "unidade": v3["unidade"],
            "preco_unitario": v3["preco_unitario"],
            "ativo": True,
        }
        sb.table("material").update(payload).eq("id", db["id"]).execute()
    print(f"  ~ {len(update_only)} atualizados (mesmo SKU)")

    # 5. Inserir novos
    for it in insert:
        sb.table("material").insert({
            "sku": it["sku"],
            "nome": it["nome"],
            "categoria": it["categoria"],
            "unidade": it["unidade"],
            "preco_unitario": it["preco_unitario"],
            "ativo": True,
            "estoque_minimo": 0,
        }).execute()
    print(f"  + {len(insert)} novos materiais inseridos")

    # 6. Recarrega map sku -> id (depois dos renames + inserts)
    db_rows2 = (
        sb.table("material").select("id, sku").like("sku", "CF%").execute().data or []
    )
    material_id_by_sku = {r["sku"]: r["id"] for r in db_rows2}

    # 7. Popular material_fornecedor
    now_iso = datetime.now(timezone.utc).isoformat()
    aliases_inserted = 0
    for it in items:
        if not it["fornecedor"]:
            continue
        material_id = material_id_by_sku.get(it["sku"])
        fornecedor_id = fornecedor_id_by_nome.get(it["fornecedor"].upper())
        if not material_id or not fornecedor_id:
            continue
        sb.table("material_fornecedor").upsert({
            "material_id": material_id,
            "fornecedor_id": fornecedor_id,
            "ultimo_preco": it["preco_unitario"],
            "ultima_compra_em": now_iso,
            # sku_fornecedor / descricao_fornecedor: nao temos (planilha so traz nome)
        }, on_conflict="material_id,fornecedor_id").execute()
        aliases_inserted += 1
    print(f"  + {aliases_inserted} aliases material_fornecedor")

    print("\nMigracao v3 concluida.")


if __name__ == "__main__":
    main()
