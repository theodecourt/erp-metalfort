import pytest

from app.services.quote_calculator import calculate


def _material(mid: str, nome: str, sku: str, unidade: str, preco: float) -> dict:
    return {"id": mid, "nome": nome, "sku": sku, "unidade": unidade, "preco_unitario": preco}


def test_calculate_basic_farmacia_3x6_core():
    bom = [
        {
            "material_id": "m1",
            "material": _material("m1", "Perfil LSF", "MT-LSF-001", "kg", 14.0),
            "formula_json": {"op": "mul", "of": [{"op": "var", "of": "area_planta_m2"}, 30]},
            "tier": "core",
            "categoria": "estrutura",
            "ordem": 1,
        },
        {
            "material_id": "m2",
            "material": _material("m2", "Split 12k", "MT-INS-003", "und", 2200.0),
            "formula_json": {
                "op": "if",
                "cond": {"op": "gt", "of": [{"op": "var", "of": "num_splits"}, 0]},
                "then": {"op": "var", "of": "num_splits"},
                "else": 0,
            },
            "tier": "addon",
            "categoria": "equipamento",
            "ordem": 2,
        },
    ]
    config = {
        "tamanho_modulo": "3x6", "qtd_modulos": 1, "pe_direito_m": 2.7,
        "esquadrias_extras": {"portas": 0, "janelas": 0},
        "tem_wc": False, "num_splits": 2,
    }

    result_core = calculate(bom, config, tier="core", gerenciamento_pct=8.0)
    assert len(result_core["itens"]) == 1
    assert result_core["itens"][0]["quantidade"] == 540
    assert result_core["itens"][0]["subtotal"] == pytest.approx(7560.0)
    assert result_core["subtotal"] == pytest.approx(7560.0)
    assert result_core["total"] == pytest.approx(7560.0 * 1.08)

    result_full = calculate(bom, config, tier="full", gerenciamento_pct=8.0)
    assert len(result_full["itens"]) == 2
    addon = [i for i in result_full["itens"] if i["tier"] == "addon"][0]
    assert addon["quantidade"] == 2
    assert addon["subtotal"] == pytest.approx(4400.0)
    assert result_full["subtotal"] == pytest.approx(7560.0 + 4400.0)


def test_calculate_skips_zero_quantities():
    bom = [
        {
            "material_id": "m1",
            "material": _material("m1", "Split", "X", "und", 100.0),
            "formula_json": {"op": "if",
                             "cond": {"op": "gt", "of": [{"op": "var", "of": "num_splits"}, 0]},
                             "then": {"op": "var", "of": "num_splits"}, "else": 0},
            "tier": "addon", "categoria": "equipamento", "ordem": 1,
        }
    ]
    config = {"tamanho_modulo": "3x3", "qtd_modulos": 1, "pe_direito_m": 2.4,
              "esquadrias_extras": {"portas": 0, "janelas": 0},
              "tem_wc": False, "num_splits": 0}
    out = calculate(bom, config, tier="full", gerenciamento_pct=8.0)
    assert out["itens"] == []
    assert out["subtotal"] == 0
