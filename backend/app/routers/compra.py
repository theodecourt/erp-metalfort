"""Endpoint admin para receber NF (compra) com N itens.

Cria fornecedor (se novo), materiais (se novos), movimentos tipo='compra' e
aliases material_fornecedor. Permite escolher por linha se atualiza
material.preco_unitario com o preço da NF, mantém o atual ou usa outro valor.
"""
from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
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
            motivo_compra = f"NF {req.nota_fiscal}" if req.nota_fiscal else "compra"
            repository.update_material_preco(
                material_id,
                novo_preco,
                responsavel_id=user["id"],
                motivo=motivo_compra,
                origem="api_compra",
            )

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


def _normalize_text(s: str) -> set[str]:
    """Tokeniza texto pra fuzzy match: lowercase, sem acentos, sem pontuacao."""
    import unicodedata
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode()
    s = s.lower()
    out: list[str] = []
    cur = ""
    for ch in s:
        if ch.isalnum():
            cur += ch
        elif cur:
            out.append(cur)
            cur = ""
    if cur:
        out.append(cur)
    # Filtra tokens muito curtos
    return {t for t in out if len(t) >= 2}


def _match_material(
    item_descricao: str,
    item_sku_fornecedor: str | None,
    aliases_by_sku: dict[str, dict],
    materiais: list[dict],
) -> dict | None:
    """Tenta achar o material no catálogo. Estratégia em camadas:
    1. SKU do fornecedor bate exato com alias previo
    2. Fuzzy de descricao_fornecedor previa do alias
    3. Fuzzy de SKU/nome do material no catalogo
    Retorna o material com pontuacao ou None.
    """
    # 1. Alias por SKU exato
    if item_sku_fornecedor and item_sku_fornecedor in aliases_by_sku:
        a = aliases_by_sku[item_sku_fornecedor]
        if a.get("material"):
            return {**a["material"], "_match": "alias_sku", "_score": 100}

    # 2/3. Fuzzy contra descrição
    desc_tokens = _normalize_text(item_descricao or "")
    if not desc_tokens:
        return None

    best: tuple[float, dict] | None = None
    for m in materiais:
        # tokens do catalogo
        cat_tokens = _normalize_text(f"{m.get('sku', '')} {m.get('nome', '')}")
        if not cat_tokens:
            continue
        common = desc_tokens & cat_tokens
        if not common:
            continue
        # Score = jaccard inflado
        score = len(common) / len(desc_tokens | cat_tokens) * 100
        if best is None or score > best[0]:
            best = (score, m)

    if best and best[0] >= 30:  # threshold sensato pra evitar match aleatorio
        return {**best[1], "_match": "fuzzy", "_score": round(best[0], 1)}
    return None


def _sniff_mime(content: bytes) -> str | None:
    """Detecta o mime real pelas primeiras bytes do arquivo.

    Cobre apenas o que /parse-nf aceita (JPEG, PNG, WebP, PDF). Retorna None
    se o conteudo nao bate com nenhum desses cabecalhos.
    """
    if len(content) < 12:
        return None
    if content.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "image/webp"
    if content.startswith(b"%PDF-"):
        return "application/pdf"
    return None


@router.post("/parse-nf")
async def parse_nf(
    file: UploadFile = File(...),
    user=Depends(require_role("admin")),
):
    """Recebe imagem (JPEG/PNG/WebP) ou PDF da NF, chama Document AI, faz
    matching contra catalogo + aliases, e retorna sugestao pra UI revisar."""
    from app.services.nf_parser import parse_nf_bytes

    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(413, "arquivo > 20MB")

    # Nao confiar no content_type do cliente — detectar pelos magic bytes.
    sniffed = _sniff_mime(content)
    if sniffed is None:
        raise HTTPException(
            400,
            "tipo de arquivo nao suportado: aceito JPEG, PNG, WebP ou PDF",
        )
    mime = sniffed

    try:
        parsed = parse_nf_bytes(content, mime)
    except RuntimeError as e:
        raise HTTPException(503, str(e)) from e
    except Exception as e:
        raise HTTPException(502, f"falha no Document AI: {type(e).__name__}: {e}") from e

    # Tenta casar fornecedor pelo CNPJ
    sb_fornecedor_id = None
    fornecedores = repository.list_fornecedores_ativos()
    cnpj = (parsed["fornecedor"].get("cnpj") or "").strip()
    if cnpj:
        cnpj_digits = "".join(ch for ch in cnpj if ch.isdigit())
        for f in fornecedores:
            f_cnpj = (f.get("cnpj") or "")
            if "".join(ch for ch in f_cnpj if ch.isdigit()) == cnpj_digits and cnpj_digits:
                sb_fornecedor_id = f["id"]
                break

    # Carrega aliases do fornecedor (se identificado) pra ajudar matching
    aliases: list[dict] = []
    aliases_by_sku: dict[str, dict] = {}
    if sb_fornecedor_id:
        aliases = repository.list_material_aliases_by_fornecedor(sb_fornecedor_id)
        for a in aliases:
            sku = (a.get("sku_fornecedor") or "").strip()
            if sku:
                aliases_by_sku[sku] = a

    materiais = repository.list_materiais_ativos()

    # Enriquece itens com sugestao de match
    suggested_items = []
    for it in parsed["itens"]:
        m = _match_material(
            it.get("descricao") or "",
            it.get("sku_fornecedor"),
            aliases_by_sku,
            materiais,
        )
        suggested_items.append({**it, "match": m})

    return {
        "fornecedor": {
            **parsed["fornecedor"],
            "match_id": sb_fornecedor_id,
        },
        "nota_fiscal": parsed["nota_fiscal"],
        "data": parsed["data"],
        "valor_total": parsed["valor_total"],
        "itens": suggested_items,
    }
