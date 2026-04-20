from __future__ import annotations

from typing import Any

from app.lib.supabase import get_admin_client


def list_materiais_ativos() -> list[dict[str, Any]]:
    sb = get_admin_client()
    res = (
        sb.table("material")
        .select("id, sku, nome, categoria, unidade, preco_unitario")
        .eq("ativo", True)
        .order("categoria")
        .order("nome")
        .execute()
    )
    return res.data or []


def get_materiais_by_ids(ids: list[str]) -> dict[str, dict[str, Any]]:
    if not ids:
        return {}
    sb = get_admin_client()
    res = sb.table("material").select("*").in_("id", ids).execute()
    return {m["id"]: m for m in (res.data or [])}


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


def list_combos() -> list[dict[str, Any]]:
    """Retorna todos os combos ativos com lista de (material, formula) por combo."""
    sb = get_admin_client()
    combos = (
        sb.table("pacote_combo")
        .select("*")
        .eq("ativo", True)
        .order("categoria")
        .order("ordem")
        .execute()
        .data
        or []
    )
    if not combos:
        return []
    combo_ids = [c["id"] for c in combos]
    mats = (
        sb.table("pacote_combo_material")
        .select("*, material(*)")
        .in_("pacote_combo_id", combo_ids)
        .order("ordem")
        .execute()
        .data
        or []
    )
    by_combo: dict[str, list[dict[str, Any]]] = {}
    for m in mats:
        by_combo.setdefault(m["pacote_combo_id"], []).append(m)
    for c in combos:
        c["materiais"] = by_combo.get(c["id"], [])
    return combos


def get_combos_by_slugs(slugs: list[str]) -> dict[str, dict[str, Any]]:
    """Retorna {slug: combo_com_materiais} para a lista de slugs informada."""
    if not slugs:
        return {}
    sb = get_admin_client()
    combos = (
        sb.table("pacote_combo")
        .select("*")
        .in_("slug", slugs)
        .eq("ativo", True)
        .execute()
        .data
        or []
    )
    if not combos:
        return {}
    combo_ids = [c["id"] for c in combos]
    mats = (
        sb.table("pacote_combo_material")
        .select("*, material(*)")
        .in_("pacote_combo_id", combo_ids)
        .order("ordem")
        .execute()
        .data
        or []
    )
    by_combo: dict[str, list[dict[str, Any]]] = {}
    for m in mats:
        by_combo.setdefault(m["pacote_combo_id"], []).append(m)
    return {c["slug"]: {**c, "materiais": by_combo.get(c["id"], [])} for c in combos}


def list_templates() -> list[dict[str, Any]]:
    """Retorna templates com selecoes {categoria: combo_slug}."""
    sb = get_admin_client()
    templates = (
        sb.table("template_orcamento").select("*").order("ordem").execute().data or []
    )
    if not templates:
        return []
    template_ids = [t["id"] for t in templates]
    selecoes = (
        sb.table("template_orcamento_selecao")
        .select("*, pacote_combo(slug)")
        .in_("template_id", template_ids)
        .execute()
        .data
        or []
    )
    by_template: dict[str, dict[str, str]] = {}
    for s in selecoes:
        by_template.setdefault(s["template_id"], {})[s["categoria"]] = s["pacote_combo"]["slug"]
    for t in templates:
        t["selecoes"] = by_template.get(t["id"], {})
    return templates


def get_templates_by_slug() -> dict[str, dict[str, str]]:
    """Retorna {template_slug: {categoria: combo_slug}} para uso do adapter."""
    return {t["slug"]: t["selecoes"] for t in list_templates()}
