from decimal import Decimal
from uuid import uuid4

import pytest
from pydantic import TypeAdapter, ValidationError

from app.models.estoque import (
    FornecedorCreate,
    FornecedorUpdate,
    MovimentoIn,
    MovimentoCompraIn,
    MovimentoSaidaObraIn,
    MovimentoAjusteIn,
)


def test_fornecedor_create_minimo():
    f = FornecedorCreate(nome="Casa do Construtor")
    assert f.nome == "Casa do Construtor"
    assert f.cnpj is None


def test_fornecedor_create_email_valido():
    FornecedorCreate(nome="X", contato_email="a@b.com")
    with pytest.raises(ValidationError):
        FornecedorCreate(nome="X", contato_email="not-an-email")


def test_movimento_compra_ok():
    m = MovimentoCompraIn(
        tipo="compra",
        material_id=uuid4(),
        quantidade=Decimal("10"),
        preco_unitario=Decimal("50"),
        fornecedor_id=uuid4(),
    )
    assert m.tipo == "compra"


def test_movimento_compra_sem_preco_falha():
    with pytest.raises(ValidationError):
        MovimentoCompraIn(
            tipo="compra",
            material_id=uuid4(),
            quantidade=Decimal("10"),
            fornecedor_id=uuid4(),  # missing preco_unitario
        )  # type: ignore[call-arg]


def test_movimento_saida_precisa_destino():
    ta = TypeAdapter(MovimentoIn)
    # destino obrigatório
    with pytest.raises(ValidationError):
        ta.validate_python({
            "tipo": "saida_obra",
            "material_id": str(uuid4()),
            "quantidade": "5",
        })
    # ok com destino texto livre
    m = ta.validate_python({
        "tipo": "saida_obra",
        "material_id": str(uuid4()),
        "quantidade": "5",
        "destino": "Manutenção",
    })
    assert isinstance(m, MovimentoSaidaObraIn)


def test_movimento_ajuste_precisa_observacao():
    with pytest.raises(ValidationError):
        MovimentoAjusteIn(
            tipo="ajuste_positivo",
            material_id=uuid4(),
            quantidade=Decimal("3"),
        )  # type: ignore[call-arg]
    m = MovimentoAjusteIn(
        tipo="ajuste_negativo",
        material_id=uuid4(),
        quantidade=Decimal("3"),
        observacao="Perda na descarga",
    )
    assert m.tipo == "ajuste_negativo"


def test_movimento_quantidade_positiva():
    with pytest.raises(ValidationError):
        MovimentoAjusteIn(
            tipo="ajuste_positivo",
            material_id=uuid4(),
            quantidade=Decimal("0"),
            observacao="x",
        )


def test_discriminator_union_resolves_each_type():
    ta = TypeAdapter(MovimentoIn)
    m = ta.validate_python({
        "tipo": "compra",
        "material_id": str(uuid4()),
        "quantidade": "2",
        "preco_unitario": "10",
        "fornecedor_id": str(uuid4()),
    })
    assert isinstance(m, MovimentoCompraIn)


def test_fornecedor_update_all_optional():
    # Update with only contato_nome should work
    u = FornecedorUpdate(contato_nome="Novo nome")
    assert u.contato_nome == "Novo nome"
    assert u.nome is None
