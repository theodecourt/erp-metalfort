"""Vincula produto -> composicao com formula de quantidade (etapa 6).

Aplica para metalfort-home e metalfort-shop (mesmas formulas — sao produtos
modulares com mesma matemática de áreas).

Vinculacoes (5 composicoes da estrutura base, conforme decisao 8 do doc de regras):
  COMP00001 LSF UE 90 (paineis paredes)        -> area_fechamento_ext_m2
  COMP00002 LSF UE 300 (painel piso)           -> area_planta_m2
  COMP00003 LSF 2UE 90 (painel cobertura)      -> area_cobertura_m2
  COMP00004 TRELICAS E PILARES STEELFRAME      -> area_cobertura_m2
  COMP00019 INSUMOS LSF AUXILIARES             -> area_planta_m2

Idempotente: upsert por (produto_id, composicao_id).

Uso:
  python -m scripts.vincula_produto_composicao              # dry-run
  python -m scripts.vincula_produto_composicao --apply
"""
from __future__ import annotations

import argparse
import sys

from app.lib.supabase import get_admin_client

PRODUTO_SLUGS = ["metalfort-home", "metalfort-shop"]

# Composicao codigo -> (formula_json, ordem)
VINCULACOES: list[tuple[str, dict, int]] = [
    ("COMP00001", {"op": "var", "of": "area_fechamento_ext_m2"}, 1),
    ("COMP00002", {"op": "var", "of": "area_planta_m2"}, 2),
    ("COMP00003", {"op": "var", "of": "area_cobertura_m2"}, 3),
    ("COMP00004", {"op": "var", "of": "area_cobertura_m2"}, 4),
    ("COMP00019", {"op": "var", "of": "area_planta_m2"}, 5),
]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()

    sb = get_admin_client()

    # Resolve produto IDs
    prods = sb.table("produto").select("id, slug").in_("slug", PRODUTO_SLUGS).execute().data or []
    prod_by_slug = {p["slug"]: p["id"] for p in prods}
    missing_prods = set(PRODUTO_SLUGS) - prod_by_slug.keys()
    if missing_prods:
        raise SystemExit(f"Produtos faltando: {missing_prods}")

    # Resolve composicao IDs
    codigos = [c for c, _, _ in VINCULACOES]
    comps = sb.table("composicao").select("id, codigo, descricao, modo").in_("codigo", codigos).execute().data or []
    comp_by_codigo = {c["codigo"]: c for c in comps}
    missing_comps = set(codigos) - comp_by_codigo.keys()
    if missing_comps:
        raise SystemExit(f"Composicoes faltando: {missing_comps}")

    # Validacao: todas devem estar em modo='automatico'
    for codigo, comp in comp_by_codigo.items():
        if comp["modo"] != "automatico":
            print(f"AVISO: {codigo} esta em modo '{comp['modo']}', esperado 'automatico'")

    print(f"Produtos: {list(prod_by_slug.keys())}")
    print(f"Composicoes a vincular: {len(VINCULACOES)}")
    print()
    print(f"{'Slug':<18} {'Codigo':<10} {'Descricao':<45} Formula")
    print("-" * 110)
    plano = []
    for slug, prod_id in prod_by_slug.items():
        for codigo, formula, ordem in VINCULACOES:
            comp = comp_by_codigo[codigo]
            plano.append({
                "produto_id": prod_id,
                "produto_slug": slug,
                "composicao_id": comp["id"],
                "composicao_codigo": codigo,
                "formula_json": formula,
                "incluir_mo": True,
                "ordem": ordem,
            })
            print(f"{slug:<18} {codigo:<10} {comp['descricao'][:43]:<45} {formula}")

    if not args.apply:
        print(f"\n[DRY-RUN] {len(plano)} vinculacoes prontas. Use --apply para gravar.")
        return

    print(f"\n=== APPLY ===")
    n_inserted = 0
    n_updated = 0
    for v in plano:
        existing = (
            sb.table("produto_composicao")
            .select("produto_id")
            .eq("produto_id", v["produto_id"])
            .eq("composicao_id", v["composicao_id"])
            .limit(1)
            .execute()
            .data
        )
        payload = {
            "produto_id": v["produto_id"],
            "composicao_id": v["composicao_id"],
            "formula_json": v["formula_json"],
            "incluir_mo": v["incluir_mo"],
            "ordem": v["ordem"],
        }
        if existing:
            sb.table("produto_composicao").update(payload).match({
                "produto_id": v["produto_id"],
                "composicao_id": v["composicao_id"],
            }).execute()
            n_updated += 1
        else:
            sb.table("produto_composicao").insert(payload).execute()
            n_inserted += 1
    print(f"Inseridos: {n_inserted}, Atualizados: {n_updated}")


if __name__ == "__main__":
    main()
