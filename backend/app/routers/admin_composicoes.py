"""Endpoints admin de leitura de composicoes (etapa 7).

Apenas leitura nesta primeira leva — CRUD via UI fica para ciclo futuro.
Insercao/edicao hoje rodam via scripts/import_composicoes_v3.py e
scripts/vincula_produto_composicao.py.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from app.lib.auth import require_role
from app.lib.supabase import get_admin_client

router = APIRouter(prefix="/api/admin/composicoes", tags=["admin-composicoes"])


@router.get("")
def list_all(
    modo: str | None = Query(default=None, description="filtro: 'automatico' | 'opcional'"),
    user=Depends(require_role("admin")),
):
    """Lista composicoes ativas com custo total computado a partir do catalogo atual."""
    sb = get_admin_client()
    q = sb.table("composicao").select("*").eq("ativo", True)
    if modo:
        if modo not in {"automatico", "opcional"}:
            raise HTTPException(400, "modo invalido (automatico | opcional)")
        q = q.eq("modo", modo)
    composicoes = q.order("codigo").execute().data or []
    if not composicoes:
        return []
    ids = [c["id"] for c in composicoes]
    materiais = (
        sb.table("composicao_material")
        .select("composicao_id, quantidade, material(id, sku, nome, nome_origem_planilha, preco_unitario, unidade, categoria)")
        .in_("composicao_id", ids)
        .execute()
        .data
        or []
    )
    by_comp: dict[str, list[dict]] = {}
    for m in materiais:
        by_comp.setdefault(m["composicao_id"], []).append(m)
    out = []
    for c in composicoes:
        items = by_comp.get(c["id"], [])
        custo = sum(
            float(it["quantidade"]) * float((it.get("material") or {}).get("preco_unitario") or 0)
            for it in items
        )
        out.append({**c, "n_materiais": len(items), "custo_calculado": round(custo, 2)})
    return out


@router.get("/{composicao_id}/materiais")
def get_materiais(
    composicao_id: str,
    user=Depends(require_role("admin")),
):
    """Lista materiais da composicao com snapshot de preco unitario do catalogo."""
    sb = get_admin_client()
    comp = sb.table("composicao").select("*").eq("id", composicao_id).limit(1).execute().data
    if not comp:
        raise HTTPException(404, "composicao nao encontrada")
    materiais = (
        sb.table("composicao_material")
        .select("*, material(id, sku, nome, nome_origem_planilha, preco_unitario, unidade, categoria, ativo)")
        .eq("composicao_id", composicao_id)
        .order("ordem")
        .execute()
        .data
        or []
    )
    return {"composicao": comp[0], "materiais": materiais}
