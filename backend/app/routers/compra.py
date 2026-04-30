"""Endpoint admin para receber NF (compra) com N itens.

Cria fornecedor (se novo), materiais (se novos), movimentos tipo='compra' e
aliases material_fornecedor. Permite escolher por linha se atualiza
material.preco_unitario com o preço da NF, mantém o atual ou usa outro valor.
"""
from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.lib import repository
from app.lib.auth import require_role

router = APIRouter(prefix="/api/admin/compra", tags=["admin-compra"])


class FornecedorNovo(BaseModel):
    nome: str = Field(min_length=1, max_length=200)
    cnpj: str | None = None
    contato_nome: str | None = None
    contato_email: str | None = None
    contato_fone: str | None = None


class MaterialNovo(BaseModel):
    sku: str = Field(min_length=1, max_length=80)
    nome: str = Field(min_length=1, max_length=200)
    categoria: str
    unidade: str
    estoque_minimo: float = Field(default=0, ge=0)


class CompraItem(BaseModel):
    # Material: existente ou criar novo inline
    material_id: str | None = None
    material_novo: MaterialNovo | None = None

    # Quantidade comprada
    quantidade: float = Field(gt=0)

    # Preço da nota (valor que vai ser registrado no movimento)
    preco_nf: float = Field(ge=0)

    # Política de atualização do preco_unitario do catálogo:
    #  "preco_nf"  → adota o preço da NF (default)
    #  "manter"    → mantém o preço atual do catálogo
    #  "outro"     → usa preco_catalogo_outro
    preco_catalogo_acao: Literal["preco_nf", "manter", "outro"] = "preco_nf"
    preco_catalogo_outro: float | None = Field(default=None, ge=0)

    # Para alias futuro (reconhecimento em próximas NFs)
    sku_fornecedor: str | None = None
    descricao_fornecedor: str | None = None


class CompraRequest(BaseModel):
    fornecedor_id: str | None = None
    fornecedor_novo: FornecedorNovo | None = None
    nota_fiscal: str | None = None
    observacao: str | None = None
    itens: list[CompraItem] = Field(min_length=1)


def _resolve_fornecedor(req: CompraRequest) -> dict[str, Any]:
    if req.fornecedor_id:
        return {"id": req.fornecedor_id}
    if not req.fornecedor_novo:
        raise HTTPException(400, "fornecedor_id ou fornecedor_novo obrigatorio")
    return repository.insert_fornecedor(req.fornecedor_novo.model_dump(exclude_none=True))


def _resolve_material(item: CompraItem) -> dict[str, Any]:
    if item.material_id:
        return {"id": item.material_id}
    if not item.material_novo:
        raise HTTPException(400, "material_id ou material_novo obrigatorio em cada item")
    payload = item.material_novo.model_dump(exclude_none=True)
    # Preço inicial = preço da NF (faz sentido pra material recém-cadastrado)
    payload["preco_unitario"] = item.preco_nf
    try:
        return repository.insert_material_basico(payload)
    except Exception as e:
        msg = str(e).lower()
        if "duplicate" in msg or "unique" in msg or "23505" in msg:
            raise HTTPException(409, f"SKU '{payload['sku']}' ja existe — use material_id em vez de criar novo") from e
        raise


def _decide_preco_catalogo(item: CompraItem) -> float | None:
    """Retorna o novo preco_unitario a aplicar, ou None se não for atualizar."""
    if item.preco_catalogo_acao == "preco_nf":
        return item.preco_nf
    if item.preco_catalogo_acao == "manter":
        return None
    if item.preco_catalogo_acao == "outro":
        if item.preco_catalogo_outro is None:
            raise HTTPException(400, "preco_catalogo_outro obrigatorio quando acao='outro'")
        return float(item.preco_catalogo_outro)
    return None


@router.post("")
def receber_compra(req: CompraRequest, user=Depends(require_role("admin"))):
    fornecedor = _resolve_fornecedor(req)
    fornecedor_id = fornecedor["id"]

    movimentos: list[dict[str, Any]] = []
    materiais_criados: list[dict[str, Any]] = []
    aliases: list[dict[str, Any]] = []

    for item in req.itens:
        mat = _resolve_material(item)
        material_id = mat["id"]
        if "sku" in mat:  # foi criado agora
            materiais_criados.append({"id": material_id, "sku": mat["sku"]})

        # 1. Movimento compra (sempre cria — é o ledger)
        mov = repository.insert_estoque_movimento({
            "material_id": material_id,
            "tipo": "compra",
            "quantidade": item.quantidade,
            "preco_unitario": item.preco_nf,
            "fornecedor_id": fornecedor_id,
            "nota_fiscal": req.nota_fiscal,
            "observacao": req.observacao,
            "criado_por": user["id"],
        })
        movimentos.append({"id": mov["id"], "material_id": material_id})

        # 2. Atualiza preco_unitario do catalogo conforme acao escolhida
        novo_preco = _decide_preco_catalogo(item)
        if novo_preco is not None:
            repository.update_material_preco(material_id, novo_preco)

        # 3. Upsert alias material x fornecedor (sempre — guarda histórico de SKU/descrição)
        repository.upsert_material_fornecedor(
            material_id=material_id,
            fornecedor_id=fornecedor_id,
            sku_fornecedor=item.sku_fornecedor,
            descricao_fornecedor=item.descricao_fornecedor,
            ultimo_preco=item.preco_nf,
        )
        aliases.append({"material_id": material_id, "fornecedor_id": fornecedor_id})

    return {
        "fornecedor_id": fornecedor_id,
        "fornecedor_criado": req.fornecedor_id is None,
        "movimentos": movimentos,
        "materiais_criados": materiais_criados,
        "aliases": aliases,
        "total_itens": len(req.itens),
        "total_valor": sum(it.quantidade * it.preco_nf for it in req.itens),
    }


@router.get("/aliases/{fornecedor_id}")
def list_aliases(fornecedor_id: str, user=Depends(require_role("admin"))):
    """Lista aliases material x fornecedor — usado pra reconhecer materiais em NFs futuras."""
    return repository.list_material_aliases_by_fornecedor(fornecedor_id)
