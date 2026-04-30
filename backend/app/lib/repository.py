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


def list_all_combos(categoria: str | None = None) -> list[dict[str, Any]]:
    """Retorna todos os combos (ativos e inativos), sem materiais. Uso admin."""
    sb = get_admin_client()
    q = sb.table("pacote_combo").select("*")
    if categoria:
        q = q.eq("categoria", categoria)
    res = q.order("categoria").order("ordem").order("nome").execute()
    return res.data or []


def get_combo_with_materiais(combo_id: str) -> dict[str, Any] | None:
    """Retorna 1 combo (qualquer ativo) com seus materiais. Uso admin."""
    sb = get_admin_client()
    res = sb.table("pacote_combo").select("*").eq("id", combo_id).limit(1).execute()
    combo = (res.data or [None])[0]
    if combo is None:
        return None
    mats = (
        sb.table("pacote_combo_material")
        .select("*, material(*)")
        .eq("pacote_combo_id", combo_id)
        .order("ordem")
        .execute()
        .data
        or []
    )
    combo["materiais"] = mats
    return combo


def update_combo(combo_id: str, fields: dict[str, Any]) -> dict[str, Any] | None:
    """Atualiza campos do combo e retorna o registro atualizado."""
    sb = get_admin_client()
    sb.table("pacote_combo").update(fields).eq("id", combo_id).execute()
    res = sb.table("pacote_combo").select("*").eq("id", combo_id).limit(1).execute()
    return (res.data or [None])[0]


def insert_combo(payload: dict[str, Any]) -> dict[str, Any]:
    """Cria combo novo (sem materiais)."""
    sb = get_admin_client()
    res = sb.table("pacote_combo").insert(payload).execute()
    return res.data[0]


def get_combo_by_slug_any(slug: str) -> dict[str, Any] | None:
    """Busca combo por slug ignorando ativo."""
    sb = get_admin_client()
    res = sb.table("pacote_combo").select("*").eq("slug", slug).limit(1).execute()
    return (res.data or [None])[0]


def list_existing_slugs_with_prefix(prefix: str) -> list[str]:
    """Retorna slugs (ativos+inativos) que comecam com o prefixo. Uso: gerar -copia-N."""
    sb = get_admin_client()
    res = sb.table("pacote_combo").select("slug").like("slug", f"{prefix}%").execute()
    return [r["slug"] for r in (res.data or [])]


def insert_combo_material(
    combo_id: str, material_id: str, formula_json: Any, ordem: int,
) -> dict[str, Any]:
    sb = get_admin_client()
    payload = {
        "pacote_combo_id": combo_id,
        "material_id": material_id,
        "formula_json": formula_json,
        "ordem": ordem,
    }
    res = sb.table("pacote_combo_material").insert(payload).execute()
    return res.data[0]


def insert_combo_materiais_bulk(combo_id: str, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    sb = get_admin_client()
    payload = [{**r, "pacote_combo_id": combo_id} for r in rows]
    sb.table("pacote_combo_material").insert(payload).execute()


def update_combo_material(
    combo_id: str, material_id: str, fields: dict[str, Any],
) -> dict[str, Any] | None:
    sb = get_admin_client()
    sb.table("pacote_combo_material").update(fields).match(
        {"pacote_combo_id": combo_id, "material_id": material_id}
    ).execute()
    res = (
        sb.table("pacote_combo_material")
        .select("*, material(*)")
        .match({"pacote_combo_id": combo_id, "material_id": material_id})
        .limit(1)
        .execute()
    )
    return (res.data or [None])[0]


def delete_combo_material(combo_id: str, material_id: str) -> None:
    sb = get_admin_client()
    sb.table("pacote_combo_material").delete().match(
        {"pacote_combo_id": combo_id, "material_id": material_id}
    ).execute()


def list_fornecedores_ativos() -> list[dict[str, Any]]:
    sb = get_admin_client()
    res = (
        sb.table("fornecedor").select("*").eq("ativo", True).order("nome").execute()
    )
    return res.data or []


def insert_fornecedor(payload: dict[str, Any]) -> dict[str, Any]:
    sb = get_admin_client()
    res = sb.table("fornecedor").insert(payload).execute()
    return res.data[0]


def insert_material_basico(payload: dict[str, Any]) -> dict[str, Any]:
    """Cria material com defaults sensatos (ativo=true, estoque_minimo=0)."""
    sb = get_admin_client()
    full = {"ativo": True, "estoque_minimo": 0, **payload}
    res = sb.table("material").insert(full).execute()
    return res.data[0]


def insert_estoque_movimento(payload: dict[str, Any]) -> dict[str, Any]:
    sb = get_admin_client()
    res = sb.table("estoque_movimento").insert(payload).execute()
    return res.data[0]


def update_material_preco(material_id: str, preco: float) -> None:
    sb = get_admin_client()
    sb.table("material").update({"preco_unitario": preco}).eq("id", material_id).execute()


def upsert_material_fornecedor(
    material_id: str,
    fornecedor_id: str,
    sku_fornecedor: str | None,
    descricao_fornecedor: str | None,
    ultimo_preco: float,
) -> None:
    """Upsert do alias material x fornecedor com último preço pago."""
    from datetime import datetime, timezone
    sb = get_admin_client()
    payload = {
        "material_id": material_id,
        "fornecedor_id": fornecedor_id,
        "sku_fornecedor": sku_fornecedor,
        "descricao_fornecedor": descricao_fornecedor,
        "ultimo_preco": ultimo_preco,
        "ultima_compra_em": datetime.now(timezone.utc).isoformat(),
    }
    sb.table("material_fornecedor").upsert(
        payload, on_conflict="material_id,fornecedor_id"
    ).execute()


def list_material_aliases_by_fornecedor(fornecedor_id: str) -> list[dict[str, Any]]:
    """Aliases registrados pra esse fornecedor — usado pra sugerir match em NF futura."""
    sb = get_admin_client()
    res = (
        sb.table("material_fornecedor")
        .select("*, material(*)")
        .eq("fornecedor_id", fornecedor_id)
        .execute()
    )
    return res.data or []


def list_templates_using_combo(combo_id: str) -> list[dict[str, Any]]:
    """Templates (Basico, Premium) que selecionam este combo em alguma categoria."""
    sb = get_admin_client()
    res = (
        sb.table("template_orcamento_selecao")
        .select("template_id, categoria, template_orcamento(slug, nome)")
        .eq("pacote_combo_id", combo_id)
        .execute()
    )
    return res.data or []


def delete_combo(combo_id: str) -> None:
    """Apaga combo + materiais. Caller deve checar referencias antes."""
    sb = get_admin_client()
    sb.table("pacote_combo_material").delete().eq("pacote_combo_id", combo_id).execute()
    sb.table("pacote_combo").delete().eq("id", combo_id).execute()


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
