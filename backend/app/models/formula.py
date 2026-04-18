from __future__ import annotations

from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field

Scalar = int | float | bool | str

Expr = Annotated[
    Union[
        "VarExpr", "BinaryExpr", "UnaryExpr", "IfExpr", "Scalar"
    ],
    Field(discriminator=None),
]


class VarExpr(BaseModel):
    op: Literal["var"]
    of: str


class BinaryExpr(BaseModel):
    op: Literal["add", "sub", "mul", "div", "eq", "gt", "gte", "lt", "lte"]
    of: list["Expr"]
    waste: float | None = None


class UnaryExpr(BaseModel):
    op: Literal["ceil", "floor", "round"]
    of: "Expr"
    waste: float | None = None


class IfExpr(BaseModel):
    op: Literal["if"]
    cond: "Expr"
    then: "Expr"
    else_: "Expr" = Field(alias="else")
    waste: float | None = None

    model_config = {"populate_by_name": True}


VarExpr.model_rebuild()
BinaryExpr.model_rebuild()
UnaryExpr.model_rebuild()
IfExpr.model_rebuild()
