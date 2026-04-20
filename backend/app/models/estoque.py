from __future__ import annotations

from decimal import Decimal
from typing import Annotated, Literal, Union
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


class FornecedorCreate(BaseModel):
    nome: str = Field(min_length=1)
    cnpj: str | None = None
    contato_nome: str | None = None
    contato_email: EmailStr | None = None
    contato_fone: str | None = None
    observacao: str | None = None


class FornecedorUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1)
    cnpj: str | None = None
    contato_nome: str | None = None
    contato_email: EmailStr | None = None
    contato_fone: str | None = None
    observacao: str | None = None
    ativo: bool | None = None


class _MovimentoBase(BaseModel):
    material_id: UUID
    quantidade: Decimal = Field(gt=0)

    @field_validator("quantidade")
    @classmethod
    def _round3(cls, v: Decimal) -> Decimal:
        return v.quantize(Decimal("0.001"))


class MovimentoCompraIn(_MovimentoBase):
    tipo: Literal["compra"]
    preco_unitario: Decimal = Field(ge=0)
    fornecedor_id: UUID
    nota_fiscal: str | None = None
    observacao: str | None = None


class MovimentoSaidaObraIn(_MovimentoBase):
    tipo: Literal["saida_obra"]
    orcamento_id: UUID | None = None
    destino: str = Field(min_length=1)
    observacao: str | None = None


class MovimentoAjusteIn(_MovimentoBase):
    tipo: Literal["ajuste_positivo", "ajuste_negativo"]
    observacao: str = Field(min_length=1)


MovimentoIn = Annotated[
    Union[MovimentoCompraIn, MovimentoSaidaObraIn, MovimentoAjusteIn],
    Field(discriminator="tipo"),
]
