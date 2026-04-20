"""Integration tests — requerem backend rodando via `make dev`.

Gated por RUN_INTEGRATION=1. Usa produto metalfort-home existente em seed.
"""
import os

import httpx
import pytest

BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_INTEGRATION") != "1",
    reason="Integration test (needs make dev running; set RUN_INTEGRATION=1)",
)


@pytest.fixture(scope="module")
def produto_id() -> str:
    res = httpx.get(f"{BACKEND_URL}/api/public/produtos")
    res.raise_for_status()
    prods = res.json()
    home = next(p for p in prods if p["slug"] == "metalfort-home")
    return home["id"]


def test_combos_endpoint_lists_21():
    res = httpx.get(f"{BACKEND_URL}/api/combos")
    res.raise_for_status()
    combos = res.json()
    assert len(combos) == 21
    cats = {c["categoria"] for c in combos}
    assert cats == {
        "fechamento_ext", "cobertura", "forro", "divisoria", "divisoria_wc",
        "piso", "subpiso", "vidro",
    }


def test_templates_endpoint_lists_basico_premium():
    res = httpx.get(f"{BACKEND_URL}/api/templates")
    res.raise_for_status()
    templates = res.json()
    slugs = {t["slug"] for t in templates}
    assert slugs == {"basico", "premium"}
    basico = next(t for t in templates if t["slug"] == "basico")
    assert basico["selecoes"]["fechamento_ext"] == "fechamento-standard"


def test_calculate_basico_vs_premium_totals(produto_id: str):
    base_config = {
        "tamanho_modulo": "3x6", "qtd_modulos": 1, "pe_direito_m": 2.7,
        "tem_wc": False,
        "esquadrias_extras": {"portas": 0, "caixilhos": []},
    }
    basico = {**base_config, "pacote_acabamento": "padrao"}
    premium = {**base_config, "pacote_acabamento": "premium"}

    r1 = httpx.post(f"{BACKEND_URL}/api/public/quote/calculate",
                    json={"produto_id": produto_id, "configuracao": basico})
    r2 = httpx.post(f"{BACKEND_URL}/api/public/quote/calculate",
                    json={"produto_id": produto_id, "configuracao": premium})
    r1.raise_for_status(); r2.raise_for_status()
    q1, q2 = r1.json(), r2.json()

    assert q2["total"] > q1["total"], (
        f"Premium deveria custar mais (basico={q1['total']}, premium={q2['total']})"
    )


def test_calculate_new_shape_vs_legacy_produce_identical_totals(produto_id: str):
    """Mesmo resultado via pacote_acabamento='padrao' (legado) ou combos=basico (novo)."""
    base = {
        "tamanho_modulo": "3x6", "qtd_modulos": 1, "pe_direito_m": 2.7,
        "tem_wc": False,
        "esquadrias_extras": {"portas": 0, "caixilhos": []},
    }
    legacy = {**base, "pacote_acabamento": "padrao"}
    novo = {**base, "combos": {
        "fechamento_ext": "fechamento-standard",
        "cobertura": "cobertura-standard",
        "forro": "forro-standard",
        "divisoria": "divisoria-simples",
        "piso": "piso-vinilico",
        "subpiso": "subpiso-seco",
        "vidro": "vidro-simples",
    }}
    r1 = httpx.post(f"{BACKEND_URL}/api/public/quote/calculate",
                    json={"produto_id": produto_id, "configuracao": legacy})
    r2 = httpx.post(f"{BACKEND_URL}/api/public/quote/calculate",
                    json={"produto_id": produto_id, "configuracao": novo})
    r1.raise_for_status(); r2.raise_for_status()
    assert r1.json()["total"] == r2.json()["total"]
