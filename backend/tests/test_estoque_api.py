from __future__ import annotations

import os
from decimal import Decimal

import httpx
import pytest

BASE = os.environ.get("API_BASE", "http://localhost:8000")
RUN_INTEGRATION = os.environ.get("RUN_INTEGRATION") == "1"

pytestmark = pytest.mark.skipif(
    not RUN_INTEGRATION,
    reason="set RUN_INTEGRATION=1 and ensure local Supabase + uvicorn are running",
)


def _admin_token() -> str:
    url = os.environ["SUPABASE_URL"].rstrip("/") + "/auth/v1/token?grant_type=password"
    key = os.environ["SUPABASE_ANON_KEY"]
    r = httpx.post(
        url,
        headers={"apikey": key, "Content-Type": "application/json"},
        json={"email": "admin@metalfort.tech", "password": "metalfort2026!"},
        timeout=5.0,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def _auth_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {_admin_token()}"}


def test_saldo_unauth_401():
    r = httpx.get(f"{BASE}/api/estoque/saldo", timeout=5.0)
    assert r.status_code == 401


def test_saldo_admin_ok():
    r = httpx.get(f"{BASE}/api/estoque/saldo", headers=_auth_headers(), timeout=5.0)
    assert r.status_code == 200
    rows = r.json()
    assert isinstance(rows, list)
    assert any(row["sku"] for row in rows)


def test_saldo_abaixo_minimo_filter():
    r = httpx.get(
        f"{BASE}/api/estoque/saldo?abaixo_minimo=true",
        headers=_auth_headers(),
        timeout=5.0,
    )
    assert r.status_code == 200
    for row in r.json():
        assert row["abaixo_minimo"] is True
        assert Decimal(str(row["estoque_minimo"])) > 0


def test_fornecedor_crud_cycle():
    h = _auth_headers()
    created = httpx.post(
        f"{BASE}/api/fornecedor",
        headers=h,
        json={"nome": "Teste CRUD", "cnpj": None, "contato_email": "a@b.com"},
        timeout=5.0,
    ).json()
    fid = created["id"]
    patched = httpx.patch(
        f"{BASE}/api/fornecedor/{fid}",
        headers=h,
        json={"contato_nome": "Joana"},
        timeout=5.0,
    ).json()
    assert patched["contato_nome"] == "Joana"
    r = httpx.delete(f"{BASE}/api/fornecedor/{fid}", headers=h, timeout=5.0)
    assert r.status_code == 200


def test_movimento_compra_invalida_sem_preco_retorna_422():
    h = _auth_headers()
    mats = httpx.get(f"{BASE}/api/material", headers=h, timeout=5.0).json()
    mid = mats[0]["id"]
    bad = {"tipo": "compra", "material_id": mid, "quantidade": "3"}
    r = httpx.post(f"{BASE}/api/estoque/movimento", headers=h, json=bad, timeout=5.0)
    assert r.status_code == 422


def test_movimento_ajuste_sem_observacao_retorna_422():
    h = _auth_headers()
    mats = httpx.get(f"{BASE}/api/material", headers=h, timeout=5.0).json()
    mid = mats[0]["id"]
    bad = {"tipo": "ajuste_positivo", "material_id": mid, "quantidade": "1"}
    r = httpx.post(f"{BASE}/api/estoque/movimento", headers=h, json=bad, timeout=5.0)
    assert r.status_code == 422


def test_fabricacao_retorna_analise_para_orcamento_seed():
    h = _auth_headers()
    orcs = httpx.get(f"{BASE}/api/quote", headers=h, timeout=5.0).json()
    if not orcs:
        pytest.skip("no orçamentos in seed")
    oid = orcs[0]["id"]
    r = httpx.get(f"{BASE}/api/estoque/fabricacao/{oid}", headers=h, timeout=5.0)
    assert r.status_code == 200
    body = r.json()
    assert body["orcamento_id"] == oid
    assert "itens" in body and "totais" in body
