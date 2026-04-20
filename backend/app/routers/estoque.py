from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from app.lib.auth import require_role
from app.lib.supabase import get_admin_client
from app.models.estoque import MovimentoIn
from app.services.estoque import (
    montar_analise_fabricacao,
    montar_saldos,
)

router = APIRouter(prefix="/api/estoque", tags=["estoque"])


# ---------- Saldo ----------

@router.get("/saldo")
def saldo(
    abaixo_minimo: bool = Query(default=False),
    q: str | None = Query(default=None),
    user=Depends(require_role("admin")),
):
    sb = get_admin_client()
    mats_q = sb.table("material").select("*").eq("ativo", True)
    if q:
        mats_q = mats_q.or_(f"sku.ilike.%{q}%,nome.ilike.%{q}%")
    materiais = mats_q.order("categoria").order("nome").execute().data or []
    saldos_v = sb.table("estoque_saldo_v").select("*").execute().data or []
    rows = montar_saldos(materiais, saldos_v)
    if abaixo_minimo:
        rows = [r for r in rows if r["abaixo_minimo"]]
    return rows


@router.get("/saldo/{material_id}")
def saldo_material(material_id: str, user=Depends(require_role("admin"))):
    sb = get_admin_client()
    mat = sb.table("material").select("*").eq("id", material_id).limit(1).execute().data
    if not mat:
        raise HTTPException(404, "Material não encontrado")
    sv = sb.table("estoque_saldo_v").select("*").eq("material_id", material_id).execute().data
    rows = montar_saldos(mat, sv or [])
    movs = (
        sb.table("estoque_movimento")
        .select("*")
        .eq("material_id", material_id)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
        .data
        or []
    )
    return {**rows[0], "ultimos_movimentos": movs}


# ---------- Movimento ----------

@router.get("/movimento")
def list_movimentos(
    material_id: str | None = None,
    tipo: str | None = None,
    fornecedor_id: str | None = None,
    orcamento_id: str | None = None,
    data_inicio: str | None = None,
    data_fim: str | None = None,
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    user=Depends(require_role("admin")),
):
    sb = get_admin_client()
    q = sb.table("estoque_movimento").select("*").order("created_at", desc=True)
    if material_id:
        q = q.eq("material_id", material_id)
    if tipo:
        q = q.eq("tipo", tipo)
    if fornecedor_id:
        q = q.eq("fornecedor_id", fornecedor_id)
    if orcamento_id:
        q = q.eq("orcamento_id", orcamento_id)
    if data_inicio:
        q = q.gte("created_at", data_inicio)
    if data_fim:
        q = q.lte("created_at", data_fim)
    q = q.range(offset, offset + limit - 1)
    return q.execute().data or []


@router.post("/movimento", status_code=201)
def create_movimento(body: MovimentoIn, user=Depends(require_role("admin"))):
    sb = get_admin_client()
    payload = body.model_dump(mode="json", exclude_none=False)
    payload["criado_por"] = user["id"]
    data = sb.table("estoque_movimento").insert(payload).execute().data
    if not data:
        raise HTTPException(500, "Falha ao inserir movimento")
    return data[0]


@router.get("/movimento/{movimento_id}")
def get_movimento(movimento_id: str, user=Depends(require_role("admin"))):
    sb = get_admin_client()
    data = sb.table("estoque_movimento").select("*").eq("id", movimento_id).limit(1).execute().data
    if not data:
        raise HTTPException(404, "Movimento não encontrado")
    return data[0]


# ---------- Análise de fabricação ----------

@router.get("/fabricacao/{orcamento_id}")
def analise_fabricacao(orcamento_id: str, user=Depends(require_role("admin"))):
    sb = get_admin_client()
    orc_res = sb.table("orcamento").select("*").eq("id", orcamento_id).limit(1).execute().data
    if not orc_res:
        raise HTTPException(404, "Orçamento não encontrado")
    orc = orc_res[0]
    produto = (
        sb.table("produto").select("id,nome").eq("id", orc["produto_id"]).limit(1).execute().data
    )
    if not produto:
        raise HTTPException(404, "Produto do orçamento não encontrado")
    itens = (
        sb.table("orcamento_item").select("*")
        .eq("orcamento_id", orcamento_id).order("ordem").execute().data or []
    )
    if not itens:
        return {
            "orcamento_id": orcamento_id,
            "orcamento_numero": orc["numero"],
            "cliente_nome": orc["cliente_nome"],
            "produto_nome": produto[0]["nome"],
            "itens": [],
            "totais": {"itens_total": 0, "itens_faltantes": 0, "custo_reposicao": 0},
        }
    mat_ids = list({it["material_id"] for it in itens})
    materiais = (
        sb.table("material").select("*").in_("id", mat_ids).execute().data or []
    )
    saldos = (
        sb.table("estoque_saldo_v").select("*").in_("material_id", mat_ids).execute().data or []
    )
    return montar_analise_fabricacao(orc, produto[0], itens, saldos, materiais)
