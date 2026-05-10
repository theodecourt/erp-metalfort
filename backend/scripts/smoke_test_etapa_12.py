"""Smoke-test final do ciclo de composicoes — etapa 12.

Cobre 3 fluxos em ponta-a-ponta:
  A. Publico: /api/public/quote/calculate — forca off as flags
  B. Logica interna do validator (sem HTTP — emula auth admin):
     - Valida que None nas 3 flags retorna 400
     - Valida que ambos false produz orcamento sem composicoes opcionais
     - Valida que fundacao=true expande COMP00020
     - Valida que projeto=true sem override expande COMP00028
     - Valida que projeto=true com override vira extra_comercial
     - Valida que gerenciamento=false zera taxa
     - Valida que gerenciamento com override custom usa o valor
  C. Endpoint admin /api/admin/composicoes (sem auth = 401)
"""
from __future__ import annotations

import json
import urllib.error
import urllib.request

from app.lib.supabase import get_admin_client
from app.routers.quote import (
    _aplicar_overrides_em_extras,
    _resolve_gerenciamento_pct,
    _validar_overrides_obrigatorios,
)
from app.services.composicao_service import (
    expand_composicoes_to_bom,
    expand_overrides_to_bom,
)
from app.services.configuracao_normalizer import normalize_configuracao
from app.lib import repository
from app.services.combo_service import build_combos_bom_from_selections
from app.services.personalizados import append_personalizados
from app.services.quote_calculator import calculate
from fastapi import HTTPException

BASE = "http://127.0.0.1:8000"


def post(path: str, body: dict) -> tuple[int, dict | str]:
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read())
        except Exception:
            return e.code, "<sem corpo>"


def get(path: str) -> int:
    try:
        with urllib.request.urlopen(f"{BASE}{path}", timeout=10) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        return e.code


def assert_eq(actual, expected, msg: str) -> bool:
    ok = actual == expected
    mark = "OK" if ok else "FALHA"
    print(f"  [{mark}] {msg}: actual={actual} expected={expected}")
    return ok


def assert_truthy(actual, msg: str) -> bool:
    ok = bool(actual)
    mark = "OK" if ok else "FALHA"
    print(f"  [{mark}] {msg}: {actual}")
    return ok


def main() -> int:
    falhas = 0

    sb = get_admin_client()
    prod_home = sb.table("produto").select("id").eq("slug", "metalfort-home").limit(1).execute().data[0]
    PRODUTO_ID = prod_home["id"]
    PRODUTO_SLUG = "metalfort-home"

    config_base = {
        "tamanho_modulo": "3x6",
        "qtd_modulos": 1,
        "pe_direito_m": 2.7,
        "acabamento_ext": "textura",
        "cor_ext": "branco",
        "combos": {
            "fechamento_ext": "fechamento-standard",
            "cobertura": "cobertura-standard",
            "forro": "forro-standard",
            "divisoria": "divisoria-simples",
            "piso": "piso-vinilico",
            "subpiso": "subpiso-seco",
        },
        "esquadrias_extras": {"portas": 0, "tamanhos_portas": [], "caixilhos": []},
        "piso": "vinilico",
        "tem_wc": False,
        "num_splits": 0,
    }

    print("=" * 80)
    print("FLUXO A — Publico /api/public/quote/calculate")
    print("=" * 80)
    res = post("/api/public/quote/calculate", {
        "produto_id": PRODUTO_ID,
        "configuracao": {**config_base, "incluir_fundacao": True, "incluir_projeto": True, "incluir_gerenciamento": False},
    })
    if not assert_eq(res[0], 200, "publico calc retorna 200 mesmo com flags"):
        falhas += 1
    body = res[1] if isinstance(res[1], dict) else {}
    if not assert_truthy(body.get("total"), "publico tem total > 0"):
        falhas += 1
    # Composicoes automaticas estao no orcamento publico
    n_comp = sum(1 for it in body.get("itens", []) if (it.get("composicao_codigo") or "").startswith("COMP000"))
    if not assert_truthy(n_comp >= 10, f"publico tem >=10 itens de composicoes automaticas (achou {n_comp})"):
        falhas += 1
    # Composicoes opcionais (fundacao COMP00020 e projeto COMP00028) NAO entram no publico
    has_fundacao = any(it.get("composicao_codigo") == "COMP00020" for it in body.get("itens", []))
    has_projeto = any(it.get("composicao_codigo") == "COMP00028" for it in body.get("itens", []))
    if not assert_eq(has_fundacao, False, "publico NAO tem itens de COMP00020 (fundacao forcada off)"):
        falhas += 1
    if not assert_eq(has_projeto, False, "publico NAO tem itens de COMP00028 (projeto forcado off)"):
        falhas += 1
    # Gerenciamento sempre 8% no publico
    if not assert_eq(float(body.get("gerenciamento_pct", -1)), 8.0, "publico aplica gerenciamento 8% mesmo se input mandar false"):
        falhas += 1

    print()
    print("=" * 80)
    print("FLUXO B — Logica interna (admin, simulando auth)")
    print("=" * 80)
    print("B1 — Validator: 3 flags none -> 400")
    try:
        _validar_overrides_obrigatorios({"incluir_fundacao": None, "incluir_projeto": False, "incluir_gerenciamento": True})
        print("  [FALHA] deveria ter dado 400")
        falhas += 1
    except HTTPException as e:
        if not assert_eq(e.status_code, 400, "validator retorna 400 quando incluir_fundacao=None"):
            falhas += 1
    try:
        _validar_overrides_obrigatorios({"incluir_fundacao": False, "incluir_projeto": False, "incluir_gerenciamento": None})
        print("  [FALHA] deveria ter dado 400")
        falhas += 1
    except HTTPException as e:
        if not assert_eq(e.status_code, 400, "validator retorna 400 quando incluir_gerenciamento=None"):
            falhas += 1

    print()
    print("B2 — _resolve_gerenciamento_pct")
    if not assert_eq(_resolve_gerenciamento_pct({"incluir_gerenciamento": True}), 8.0,
                     "gerenciamento True sem override = 8%"):
        falhas += 1
    if not assert_eq(_resolve_gerenciamento_pct({"incluir_gerenciamento": True, "gerenciamento_pct_override": 5.5}),
                     5.5, "gerenciamento True com override 5.5 = 5.5%"):
        falhas += 1
    if not assert_eq(_resolve_gerenciamento_pct({"incluir_gerenciamento": False}), 0.0,
                     "gerenciamento False = 0%"):
        falhas += 1

    print()
    print("B3 — Pipeline interno completo (admin com flags marcadas)")
    config_full = {
        **config_base,
        "incluir_fundacao": True,
        "incluir_projeto": True,
        "valor_projeto_override": None,  # usa default R$142
        "incluir_gerenciamento": True,
        "gerenciamento_pct_override": None,  # usa default 8%
    }
    templates = repository.get_templates_by_slug()
    config_norm = normalize_configuracao(config_full, templates=templates)
    _validar_overrides_obrigatorios(config_norm)
    config_norm = _aplicar_overrides_em_extras(config_norm)
    bom = repository.list_bom_regras(PRODUTO_ID)
    bom_composicoes = expand_composicoes_to_bom(PRODUTO_ID, config_norm)
    bom_overrides = expand_overrides_to_bom(config_norm)
    combos_bom = build_combos_bom_from_selections(config_norm.get("combos") or {})
    quote = calculate(
        append_personalizados(bom + bom_composicoes + bom_overrides, config_norm), config_norm,
        tier="full", gerenciamento_pct=_resolve_gerenciamento_pct(config_norm), combos_bom=combos_bom,
    )
    if not assert_truthy(quote["total"] > 0, f"interno produz total {quote['total']:.2f}"):
        falhas += 1
    n_fundacao_items = sum(1 for it in quote["itens"] if it.get("composicao_codigo") == "COMP00020")
    if not assert_truthy(n_fundacao_items >= 1,
                         f"interno com fundacao=true tem itens COMP00020 (achou {n_fundacao_items})"):
        falhas += 1
    n_projeto_items = sum(1 for it in quote["itens"] if it.get("composicao_codigo") == "COMP00028")
    if not assert_truthy(n_projeto_items >= 1,
                         f"interno com projeto=true tem itens COMP00028 (achou {n_projeto_items})"):
        falhas += 1
    if not assert_eq(float(quote["gerenciamento_pct"]), 8.0,
                     "interno gerenciamento=true sem override aplica 8%"):
        falhas += 1

    print()
    print("B4 — Override de projeto vira extra_comercial e nao expande COMP00028")
    config_proj_override = {**config_full, "valor_projeto_override": 80.0}
    config_proj_override = normalize_configuracao(config_proj_override, templates=templates)
    config_proj_override = _aplicar_overrides_em_extras(config_proj_override)
    bom_overrides_2 = expand_overrides_to_bom(config_proj_override)
    n_projeto_2 = sum(1 for r in bom_overrides_2 if r.get("composicao_codigo") == "COMP00028")
    if not assert_eq(n_projeto_2, 0, "com valor_projeto_override=80, COMP00028 NAO expande em BOM"):
        falhas += 1
    extras = config_proj_override.get("extras_comerciais") or []
    has_override_extra = any(
        e.get("descricao", "").startswith("Projetos complementares (override)") for e in extras
    )
    if not assert_truthy(has_override_extra, "extras_comerciais ganhou linha 'Projetos complementares (override)'"):
        falhas += 1

    print()
    print("B5 — Gerenciamento desligado: total = subtotal")
    config_no_ger = {**config_full, "incluir_gerenciamento": False}
    config_no_ger = normalize_configuracao(config_no_ger, templates=templates)
    config_no_ger = _aplicar_overrides_em_extras(config_no_ger)
    bom_c = expand_composicoes_to_bom(PRODUTO_ID, config_no_ger)
    bom_o = expand_overrides_to_bom(config_no_ger)
    combos_b = build_combos_bom_from_selections(config_no_ger.get("combos") or {})
    quote_no_ger = calculate(
        append_personalizados(bom + bom_c + bom_o, config_no_ger), config_no_ger,
        tier="full", gerenciamento_pct=_resolve_gerenciamento_pct(config_no_ger), combos_bom=combos_b,
    )
    if not assert_eq(float(quote_no_ger["gerenciamento_pct"]), 0.0,
                     "gerenciamento off resulta em 0%"):
        falhas += 1
    if not assert_eq(round(quote_no_ger["total"], 2), round(quote_no_ger["subtotal"], 2),
                     "com gerenciamento off, total = subtotal"):
        falhas += 1

    print()
    print("=" * 80)
    print("FLUXO C — Endpoints admin sem auth (401)")
    print("=" * 80)
    if not assert_eq(get("/api/admin/composicoes"), 401, "GET /api/admin/composicoes sem auth = 401"):
        falhas += 1
    if not assert_eq(get(f"/api/public/produto/{PRODUTO_SLUG}"), 200,
                     "GET /api/public/produto/<slug> retorna 200"):
        falhas += 1

    print()
    print("=" * 80)
    print(f"RESUMO: {falhas} falha(s) detectada(s)")
    print("=" * 80)
    return 0 if falhas == 0 else 1


if __name__ == "__main__":
    import sys
    sys.exit(main())
