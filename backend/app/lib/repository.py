from __future__ import annotations

from typing import Any

from app.lib.supabase import get_admin_client


def list_produtos_ativos() -> list[dict[str, Any]]:
    sb = get_admin_client()
    res = sb.table("produto").select("*").eq("ativo", True).order("nome").execute()
    return res.data or []


def get_produto_by_slug(slug: str) -> dict[str, Any] | None:
    sb = get_admin_client()
    res = sb.table("produto").select("*").eq("slug", slug).eq("ativo", True).limit(1).execute()
    return (res.data or [None])[0]


def list_opcoes(produto_id: str) -> list[dict[str, Any]]:
    sb = get_admin_client()
    res = sb.table("produto_opcao").select("*").eq("produto_id", produto_id).order("ordem").execute()
    return res.data or []


def list_bom_regras(produto_id: str) -> list[dict[str, Any]]:
    sb = get_admin_client()
    res = (
        sb.table("produto_bom_regra")
        .select("*, material(*)")
        .eq("produto_id", produto_id)
        .order("ordem")
        .execute()
    )
    return res.data or []


def insert_orcamento(payload: dict[str, Any]) -> dict[str, Any]:
    sb = get_admin_client()
    payload.pop("_year", None)  # DB trigger generates `numero` from year+sequence
    res = sb.table("orcamento").insert(payload).execute()
    return res.data[0]


def insert_orcamento_itens(orcamento_id: str, itens: list[dict[str, Any]]) -> None:
    if not itens:
        return
    sb = get_admin_client()
    rows = [{**it, "orcamento_id": orcamento_id} for it in itens]
    sb.table("orcamento_item").insert(rows).execute()
