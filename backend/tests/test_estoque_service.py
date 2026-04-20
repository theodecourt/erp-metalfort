from decimal import Decimal
from uuid import uuid4

from app.services.estoque import (
    saldo_from_movimentos,
    montar_saldos,
    montar_analise_fabricacao,
)


def _mov(tipo: str, qtd: str) -> dict:
    return {"tipo": tipo, "quantidade": Decimal(qtd)}


def test_saldo_sem_movimentos_e_zero():
    assert saldo_from_movimentos([]) == Decimal("0")


def test_saldo_soma_compra_e_subtrai_saida():
    movs = [
        _mov("compra", "10"),
        _mov("saida_obra", "3"),
        _mov("ajuste_positivo", "2"),
        _mov("ajuste_negativo", "1"),
    ]
    assert saldo_from_movimentos(movs) == Decimal("8")


def test_saldo_pode_ser_negativo():
    movs = [_mov("saida_obra", "5")]
    assert saldo_from_movimentos(movs) == Decimal("-5")


def test_montar_saldos_marca_abaixo_do_minimo():
    material = {
        "id": str(uuid4()),
        "sku": "MT-FCH-001",
        "nome": "Placa",
        "categoria": "fechamento",
        "unidade": "pc",
        "preco_unitario": 219.90,
        "estoque_minimo": 40,
        "ativo": True,
    }
    saldos_v = [{"material_id": material["id"], "saldo": Decimal("15")}]
    result = montar_saldos([material], saldos_v)
    assert len(result) == 1
    row = result[0]
    assert row["saldo"] == Decimal("15")
    assert row["abaixo_minimo"] is True


def test_montar_saldos_minimo_zero_nunca_alerta():
    material = {
        "id": str(uuid4()),
        "sku": "X", "nome": "Y", "categoria": "acabamento",
        "unidade": "pc", "preco_unitario": 1, "estoque_minimo": 0, "ativo": True,
    }
    saldos_v = [{"material_id": material["id"], "saldo": Decimal("0")}]
    assert montar_saldos([material], saldos_v)[0]["abaixo_minimo"] is False


def test_analise_fabricacao_classifica_status_e_custo():
    mid = str(uuid4())
    orc = {"id": str(uuid4()), "numero": "ORC-2026-0001",
           "cliente_nome": "Tatuí", "produto_id": str(uuid4())}
    itens_orc = [{
        "material_id": mid, "descricao": "Placa Glasroc", "unidade": "pc",
        "quantidade": Decimal("28"), "preco_unitario": Decimal("219.90"),
        "subtotal": Decimal("6157.20"), "tier": "core",
        "categoria": "fechamento", "ordem": 1,
    }]
    saldos = [{"material_id": mid, "saldo": Decimal("23")}]
    materiais = [{"id": mid, "sku": "MT-FCH-001", "nome": "Placa",
                  "unidade": "pc", "preco_unitario": 219.90}]
    produto = {"id": orc["produto_id"], "nome": "Farmácia Express 3×6"}

    result = montar_analise_fabricacao(orc, produto, itens_orc, saldos, materiais)
    assert result["orcamento_numero"] == "ORC-2026-0001"
    assert len(result["itens"]) == 1
    linha = result["itens"][0]
    assert linha["status"] == "faltante"
    assert linha["falta"] == Decimal("5")
    assert linha["custo_reposicao_linha"] == Decimal("1099.50")
    assert result["totais"]["itens_faltantes"] == 1
    assert result["totais"]["custo_reposicao"] == Decimal("1099.50")


def test_analise_fabricacao_saldo_suficiente_nao_conta_falta():
    mid = str(uuid4())
    orc = {"id": str(uuid4()), "numero": "ORC-2026-0002",
           "cliente_nome": "A", "produto_id": str(uuid4())}
    itens_orc = [{
        "material_id": mid, "descricao": "X", "unidade": "pc",
        "quantidade": Decimal("10"), "preco_unitario": Decimal("5"),
        "subtotal": Decimal("50"), "tier": "core",
        "categoria": "estrutura", "ordem": 1,
    }]
    saldos = [{"material_id": mid, "saldo": Decimal("100")}]
    materiais = [{"id": mid, "sku": "X", "nome": "X", "unidade": "pc",
                  "preco_unitario": 5}]
    produto = {"id": orc["produto_id"], "nome": "P"}

    result = montar_analise_fabricacao(orc, produto, itens_orc, saldos, materiais)
    linha = result["itens"][0]
    assert linha["status"] == "suficiente"
    assert linha["falta"] == Decimal("0")
    assert result["totais"]["itens_faltantes"] == 0
    assert result["totais"]["custo_reposicao"] == Decimal("0")
