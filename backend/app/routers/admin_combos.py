"""Endpoints admin para gestao de combos: list, create, edit metadata, duplicate, materiais CRUD."""
from __future__ import annotations

import re

from fastapi import APIRouter, Depends, HTTPException, Query

from app.lib import repository
from app.lib.auth import require_role

router = APIRouter(prefix="/api/admin/combos", tags=["admin-combos"])

_CATEGORIAS_VALIDAS = {
    "fechamento_ext", "cobertura", "forro", "divisoria",
    "divisoria_wc", "piso", "subpiso", "vidro",
}
_PATCH_FIELDS = {"nome", "descricao", "ordem", "ativo"}
_CREATE_FIELDS = {"slug", "categoria", "nome", "descricao", "ordem", "ativo"}
_MATERIAL_PATCH_FIELDS = {"formula_json", "ordem"}
_SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def _validate_slug(slug: str) -> str:
    s = (slug or "").strip().lower()
    if not s or not _SLUG_RE.match(s):
        raise HTTPException(400, "slug invalido (use letras minusculas, numeros e hifens)")
    return s


def _validate_categoria(categoria: str) -> str:
    if categoria not in _CATEGORIAS_VALIDAS:
        raise HTTPException(400, f"categoria invalida; use uma de {sorted(_CATEGORIAS_VALIDAS)}")
    return categoria


def _next_copy_slug(base_slug: str) -> str:
    """Gera <base>-copia, <base>-copia-2, ... evitando colisao."""
    candidate = f"{base_slug}-copia"
    existing = set(repository.list_existing_slugs_with_prefix(candidate))
    if candidate not in existing:
        return candidate
    i = 2
    while f"{candidate}-{i}" in existing:
        i += 1
    return f"{candidate}-{i}"


@router.get("")
def list_all(
    categoria: str | None = Query(default=None),
    user=Depends(require_role("admin")),
):
    return repository.list_all_combos(categoria=categoria)


@router.post("")
def create(body: dict, user=Depends(require_role("admin"))):
    payload = {k: v for k, v in body.items() if k in _CREATE_FIELDS}
    if "slug" not in payload or "categoria" not in payload or "nome" not in payload:
        raise HTTPException(400, "slug, categoria e nome sao obrigatorios")
    payload["slug"] = _validate_slug(payload["slug"])
    payload["categoria"] = _validate_categoria(payload["categoria"])
    if not str(payload["nome"]).strip():
        raise HTTPException(400, "nome nao pode ser vazio")
    if "ordem" in payload:
        try:
            payload["ordem"] = int(payload["ordem"])
        except (TypeError, ValueError):
            raise HTTPException(400, "ordem deve ser inteiro")
    else:
        payload["ordem"] = 0
    if repository.get_combo_by_slug_any(payload["slug"]) is not None:
        raise HTTPException(409, f"slug '{payload['slug']}' ja existe")
    return repository.insert_combo(payload)


@router.patch("/{combo_id}")
def patch(combo_id: str, body: dict, user=Depends(require_role("admin"))):
    payload = {k: v for k, v in body.items() if k in _PATCH_FIELDS}
    if not payload:
        raise HTTPException(400, "nothing to update")
    if "ordem" in payload:
        try:
            payload["ordem"] = int(payload["ordem"])
        except (TypeError, ValueError):
            raise HTTPException(400, "ordem deve ser inteiro")
    if "nome" in payload and not str(payload["nome"]).strip():
        raise HTTPException(400, "nome nao pode ser vazio")
    updated = repository.update_combo(combo_id, payload)
    if updated is None:
        raise HTTPException(404, "combo nao encontrado")
    return updated


@router.post("/{combo_id}/duplicate")
def duplicate(combo_id: str, user=Depends(require_role("admin"))):
    src = repository.get_combo_with_materiais(combo_id)
    if src is None:
        raise HTTPException(404, "combo nao encontrado")
    new_slug = _next_copy_slug(src["slug"])
    new_combo = repository.insert_combo({
        "slug": new_slug,
        "categoria": src["categoria"],
        "nome": f"{src['nome']} (cópia)",
        "descricao": src.get("descricao"),
        "ordem": src.get("ordem", 0),
        "ativo": False,
    })
    rows = [
        {
            "material_id": m["material_id"],
            "formula_json": m["formula_json"],
            "ordem": m["ordem"],
        }
        for m in src.get("materiais", [])
    ]
    repository.insert_combo_materiais_bulk(new_combo["id"], rows)
    new_combo["materiais"] = repository.get_combo_with_materiais(new_combo["id"])["materiais"]
    return new_combo


@router.delete("/{combo_id}")
def hard_delete(combo_id: str, user=Depends(require_role("admin"))):
    combo = repository.get_combo_with_materiais(combo_id)
    if combo is None:
        raise HTTPException(404, "combo nao encontrado")
    refs = repository.list_templates_using_combo(combo_id)
    if refs:
        templates = sorted({
            r["template_orcamento"]["nome"] for r in refs
            if r.get("template_orcamento")
        })
        raise HTTPException(
            409,
            f"combo referenciado em template(s): {', '.join(templates)}. "
            "Remova a selecao no template antes de excluir.",
        )
    repository.delete_combo(combo_id)
    return {"ok": True}


@router.get("/{combo_id}/materiais")
def list_materiais(combo_id: str, user=Depends(require_role("admin"))):
    combo = repository.get_combo_with_materiais(combo_id)
    if combo is None:
        raise HTTPException(404, "combo nao encontrado")
    return combo["materiais"]


@router.post("/{combo_id}/materiais")
def add_material(combo_id: str, body: dict, user=Depends(require_role("admin"))):
    if repository.get_combo_with_materiais(combo_id) is None:
        raise HTTPException(404, "combo nao encontrado")
    material_id = body.get("material_id")
    formula_json = body.get("formula_json")
    if not material_id:
        raise HTTPException(400, "material_id obrigatorio")
    if formula_json is None:
        raise HTTPException(400, "formula_json obrigatorio")
    try:
        ordem = int(body.get("ordem", 0))
    except (TypeError, ValueError):
        raise HTTPException(400, "ordem deve ser inteiro")
    try:
        repository.insert_combo_material(combo_id, material_id, formula_json, ordem)
    except Exception as e:
        msg = str(e).lower()
        if "duplicate" in msg or "unique" in msg or "23505" in msg:
            raise HTTPException(409, "material ja esta no combo") from e
        raise
    res = repository.get_combo_with_materiais(combo_id)
    return [m for m in res["materiais"] if m["material_id"] == material_id][0]


@router.patch("/{combo_id}/materiais/{material_id}")
def patch_material(combo_id: str, material_id: str, body: dict, user=Depends(require_role("admin"))):
    payload = {k: v for k, v in body.items() if k in _MATERIAL_PATCH_FIELDS}
    if not payload:
        raise HTTPException(400, "nothing to update")
    if "ordem" in payload:
        try:
            payload["ordem"] = int(payload["ordem"])
        except (TypeError, ValueError):
            raise HTTPException(400, "ordem deve ser inteiro")
    updated = repository.update_combo_material(combo_id, material_id, payload)
    if updated is None:
        raise HTTPException(404, "material nao encontrado no combo")
    return updated


@router.delete("/{combo_id}/materiais/{material_id}")
def remove_material(combo_id: str, material_id: str, user=Depends(require_role("admin"))):
    repository.delete_combo_material(combo_id, material_id)
    return {"ok": True}
