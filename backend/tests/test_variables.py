import json
from pathlib import Path

import pytest

from app.services.variables import derive

FIXTURES = json.loads(
    (Path(__file__).resolve().parents[2] / "database/tests/variables-fixtures.json").read_text()
)


@pytest.mark.parametrize("case", FIXTURES["cases"], ids=lambda c: c["name"])
def test_derive(case):
    assert derive(case["config"]) == case["expect"]


def test_derive_exposes_area_parede_wc_and_nao_wc():
    config = {
        "tamanho_modulo": "3x6",
        "qtd_modulos": 2,
        "pe_direito_m": 2.7,
        "comp_paredes_int_m": 6.0,
        "tem_wc": True,
    }
    v = derive(config)
    assert v["area_parede_wc_m2"] > 0
    assert v["area_parede_interna_nao_wc_m2"] > 0
    assert v["area_parede_wc_m2"] + v["area_parede_interna_nao_wc_m2"] == pytest.approx(
        v["area_parede_interna_m2"], abs=0.01
    )


def test_derive_exposes_area_caixilhos():
    config = {
        "tamanho_modulo": "3x6",
        "qtd_modulos": 1,
        "pe_direito_m": 2.7,
        "esquadrias_extras": {
            "portas": 0,
            "caixilhos": [
                {"tipo": "janela", "largura_m": 1.2, "altura_m": 1.0, "qtd": 2},
                {"tipo": "porta_vidro", "largura_m": 0.9, "altura_m": 2.1, "qtd": 1},
            ],
        },
    }
    v = derive(config)
    # 2 * 1.2 * 1.0 + 1 * 0.9 * 2.1 = 2.4 + 1.89 = 4.29
    assert v["area_caixilhos_m2"] == pytest.approx(4.29)


def test_derive_wc_false_gives_zero_wc_area():
    config = {
        "tamanho_modulo": "3x6",
        "qtd_modulos": 2,
        "pe_direito_m": 2.7,
        "comp_paredes_int_m": 6.0,
        "tem_wc": False,
    }
    v = derive(config)
    assert v["area_parede_wc_m2"] == 0.0
    assert v["area_parede_interna_nao_wc_m2"] == pytest.approx(v["area_parede_interna_m2"])
