"""Tests for combo_service — converte combos selecionados em regras BOM sinteticas."""
from app.services.combo_service import calcular_itens_bom


def _combo(slug: str, categoria: str, materiais: list[dict]) -> dict:
    return {
        "id": slug,
        "slug": slug,
        "categoria": categoria,
        "nome": slug,
        "materiais": materiais,
    }


def _combo_material(material_id: str, sku: str, preco: float, formula, ordem: int = 0) -> dict:
    return {
        "material_id": material_id,
        "material": {
            "id": material_id,
            "sku": sku,
            "nome": sku,
            "unidade": "m2",
            "preco_unitario": preco,
        },
        "formula_json": formula,
        "ordem": ordem,
    }


def test_calcular_itens_bom_returns_empty_for_no_selections():
    assert calcular_itens_bom({}, combos_by_slug={}) == []


def test_calcular_itens_bom_converts_single_combo_to_bom_rules():
    combo = _combo("fechamento-standard", "fechamento_ext", [
        _combo_material("m1", "MT-FCH-001", 219.9,
                         {"op": "var", "of": "area_fechamento_ext_m2"}, 1),
    ])
    selections = {"fechamento_ext": "fechamento-standard"}
    rules = calcular_itens_bom(selections, combos_by_slug={"fechamento-standard": combo})

    assert len(rules) == 1
    r = rules[0]
    assert r["material_id"] == "m1"
    assert r["tier"] == "core"
    assert r["categoria"] == "fechamento_ext"
    assert r["combo_slug"] == "fechamento-standard"
    assert r["formula_json"] == {"op": "var", "of": "area_fechamento_ext_m2"}


def test_calcular_itens_bom_preserves_material_ordem():
    combo = _combo("c1", "cobertura", [
        _combo_material("m2", "MT-COB-002", 50.0, 1, ordem=2),
        _combo_material("m1", "MT-COB-001", 110.0, 1, ordem=1),
    ])
    rules = calcular_itens_bom({"cobertura": "c1"}, combos_by_slug={"c1": combo})
    # combo_service preserva ordem das materiais (ambas na mesma categoria)
    assert [r["ordem"] % 100 for r in rules] == [2, 1]


def test_calcular_itens_bom_skips_combos_not_in_map():
    selections = {"fechamento_ext": "fechamento-inexistente"}
    rules = calcular_itens_bom(selections, combos_by_slug={})
    assert rules == []


def test_calcular_itens_bom_multiple_combos():
    combo_a = _combo("a", "fechamento_ext", [_combo_material("m1", "X", 10.0, 1)])
    combo_b = _combo("b", "cobertura", [_combo_material("m2", "Y", 20.0, 1)])
    selections = {"fechamento_ext": "a", "cobertura": "b"}
    rules = calcular_itens_bom(selections, combos_by_slug={"a": combo_a, "b": combo_b})
    assert len(rules) == 2
    cats = {r["categoria"] for r in rules}
    assert cats == {"fechamento_ext", "cobertura"}
