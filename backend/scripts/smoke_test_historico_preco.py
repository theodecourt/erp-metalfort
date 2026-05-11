"""Smoke-test do ciclo (e) — historico de preco.

Valida ponta-a-ponta:
  1. Snapshot inicial: cada material tem 1 entrada com origem='migration'.
  2. Update via repository.update_material_preco com origem='api_material'
     gera entrada com responsavel + motivo.
  3. Update com origem='api_compra' gera entrada com motivo de NF.
  4. Update com origem='import_script' gera entrada de import.
  5. Update direto via sb.table().update() (simula SQL ad-hoc) cai como
     'manual_sql' e responsavel_id NULL — comportamento esperado quando
     contexto nao e setado.
  6. Protecao: chamar a RPC com origem='manual_sql' DEVE FALHAR
     (validacao server-side rejeita).
  7. Cada via gera EXATAMENTE 1 nova entrada (sem duplicacao, sem perda).

Estado e revertido ao final (preco volta ao original).

Uso:
  python -m scripts.smoke_test_historico_preco
"""
from __future__ import annotations

import sys

from app.lib import repository
from app.lib.supabase import get_admin_client


def listar(material_id: str) -> list[dict]:
    return repository.list_material_preco_historico(material_id)


def assert_eq(actual, expected, msg: str) -> None:
    if actual != expected:
        print(f"  [FAIL]{msg}: esperado={expected!r}, obtido={actual!r}")
        sys.exit(1)
    print(f"  [OK]{msg}")


def assert_true(cond: bool, msg: str) -> None:
    if not cond:
        print(f"  [FAIL]{msg}")
        sys.exit(1)
    print(f"  [OK]{msg}")


def main() -> None:
    print("=== Smoke-test: historico de preco ===\n")
    sb = get_admin_client()

    # Pega 1 material ativo + 1 usuario admin
    mat_row = sb.table("material").select("*").eq("ativo", True).limit(1).execute().data
    if not mat_row:
        print("Sem materiais ativos pra testar.")
        sys.exit(1)
    mat = mat_row[0]
    preco_original = float(mat["preco_unitario"])
    print(f"Material: {mat['sku']} {mat['nome'][:40]} · preco atual R$ {preco_original}")

    user_row = sb.table("usuario_interno").select("*").eq("role", "admin").limit(1).execute().data
    user_id = user_row[0]["id"] if user_row else None
    print(f"Responsavel de teste: {user_row[0]['nome'] if user_row else 'NULL'}")

    historico_inicial = listar(mat["id"])
    n_inicial = len(historico_inicial)
    print(f"Historico inicial: {n_inicial} entrada(s)")

    # --- 1. Snapshot inicial existe e tem origem=migration ---
    print("\n[1] Snapshot inicial")
    snap = [h for h in historico_inicial if h["origem"] == "migration"]
    assert_true(len(snap) >= 1, "ha snapshot inicial com origem='migration'")
    assert_eq(snap[-1]["preco_unitario"], mat["preco_unitario"], "snapshot bate com preco atual")

    # --- 2. Update via api_material ---
    print("\n[2] Update via api_material (PATCH material)")
    preco_2 = round(preco_original + 1.11, 2)
    repository.update_material_preco(
        mat["id"], preco_2,
        responsavel_id=user_id, motivo="teste smoke api_material", origem="api_material",
    )
    hist = listar(mat["id"])
    assert_eq(len(hist), n_inicial + 1, "exatamente 1 nova entrada")
    e = hist[0]  # mais recente primeiro
    assert_eq(e["origem"], "api_material", "origem='api_material'")
    assert_eq(float(e["preco_unitario"]), preco_2, "preco novo correto")
    assert_eq(float(e["preco_anterior"]), preco_original, "preco_anterior correto")
    assert_eq(e["responsavel_id"], user_id, "responsavel_id propagado")
    assert_eq(e["motivo"], "teste smoke api_material", "motivo propagado")

    # --- 3. Update via api_compra ---
    print("\n[3] Update via api_compra (POST /admin/compra)")
    preco_3 = round(preco_2 + 2.22, 2)
    repository.update_material_preco(
        mat["id"], preco_3,
        responsavel_id=user_id, motivo="NF 99999", origem="api_compra",
    )
    hist = listar(mat["id"])
    assert_eq(len(hist), n_inicial + 2, "+1 entrada (total 2 novas)")
    e = hist[0]
    assert_eq(e["origem"], "api_compra", "origem='api_compra'")
    assert_eq(e["motivo"], "NF 99999", "motivo de NF correto")

    # --- 4. Update via import_script ---
    print("\n[4] Update via import_script")
    preco_4 = round(preco_3 + 3.33, 2)
    repository.update_material_preco(
        mat["id"], preco_4,
        motivo="teste import smoke", origem="import_script",
    )
    hist = listar(mat["id"])
    assert_eq(len(hist), n_inicial + 3, "+1 entrada (total 3 novas)")
    e = hist[0]
    assert_eq(e["origem"], "import_script", "origem='import_script'")
    assert_eq(e["responsavel_id"], None, "responsavel_id NULL (script sem user)")

    # --- 5. Update direto via sb.table().update() (sem contexto) ---
    print("\n[5] Update direto via sb.table() — sem contexto")
    preco_5 = round(preco_4 + 4.44, 2)
    sb.table("material").update({"preco_unitario": preco_5}).eq("id", mat["id"]).execute()
    hist = listar(mat["id"])
    assert_eq(len(hist), n_inicial + 4, "+1 entrada (total 4 novas)")
    e = hist[0]
    assert_eq(e["origem"], "manual_sql", "origem fallback='manual_sql'")
    assert_eq(e["responsavel_id"], None, "responsavel_id NULL (sem contexto)")
    assert_eq(e["motivo"], None, "motivo NULL (sem contexto)")

    # --- 6. RPC rejeita origens invalidas ---
    print("\n[6] Protecao: RPC rejeita origem='manual_sql' e 'migration'")
    rejected = 0
    for bad in ("manual_sql", "migration", "invalido"):
        try:
            repository.update_material_preco(
                mat["id"], preco_5, motivo="deve falhar", origem=bad,
            )
            print(f"  [FAIL]RPC aceitou origem invalida '{bad}' (NAO deveria)")
            sys.exit(1)
        except Exception as ex:
            msg = str(ex).lower()
            if "origem" in msg or "invalid" in msg:
                rejected += 1
            else:
                print(f"  [FAIL]erro inesperado pra '{bad}': {ex}")
                sys.exit(1)
    assert_eq(rejected, 3, "3 origens invalidas rejeitadas")

    # --- 7. Revertendo estado ---
    print("\n[7] Restaurando preco original")
    repository.update_material_preco(
        mat["id"], preco_original,
        responsavel_id=user_id, motivo="smoke test cleanup", origem="api_material",
    )
    hist = listar(mat["id"])
    assert_eq(len(hist), n_inicial + 5, "+1 entrada cleanup (total 5 novas)")

    # --- Resumo ---
    print("\n=== Resumo do historico (5 mais recentes) ===")
    for h in hist[:6]:
        resp = (h["responsavel_id"] or "—")[:8]
        motivo = (h["motivo"] or "—")[:30]
        anterior = h["preco_anterior"] if h["preco_anterior"] is not None else "-"
        print(
            f"  R$ {h['preco_unitario']:>8} <- R$ {str(anterior):>8} "
            f"| {h['origem']:14} | resp={resp:8} | {motivo}"
        )

    print("\n[OK] SMOKE TEST PASSOU")
    print(f"  Material {mat['sku']} foi mexido 5 vezes e restaurado ao preco original.")
    print(f"  Historico ganhou 5 entradas alem do snapshot inicial.")


if __name__ == "__main__":
    main()
