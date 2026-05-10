"""Checkpoint da Etapa 9 — overrides de orcamento.

Testa 4 cenarios via API:
  A. Publico /api/public/quote/calculate (forca off as flags)
  B. Interno /api/quote/calculate sem flags (deve retornar 401 sem auth)
  C. Interno SEM responder incluir_fundacao -> 400
  D. (Cenarios com auth ficariam aqui — sem token nao da pra rodar)

Pra (D) — testar com flags ativadas — o usuario testa via UI na etapa 11.
"""
from __future__ import annotations

import json
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8000"
PRODUTO_ID = "25e6e4a4-ec82-4623-a83c-c177cc265845"  # metalfort-home

CONFIG_BASE = {
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


def cenario(nome: str, path: str, body: dict, expected_status: int):
    status, body_resp = post(path, body)
    ok = status == expected_status
    mark = "OK" if ok else "FALHA"
    print(f"[{mark}] {nome}: status={status} (esperado {expected_status})")
    if isinstance(body_resp, dict):
        if "total" in body_resp:
            print(f"  total: R$ {body_resp['total']:,.2f}  itens={len(body_resp.get('itens', []))}  extras={len(body_resp.get('extras', []))}")
        elif "detail" in body_resp:
            print(f"  detail: {body_resp['detail']}")
    elif isinstance(body_resp, str):
        print(f"  body: {body_resp[:200]}")
    return ok, body_resp


def main() -> None:
    print("=" * 80)
    print("CENARIO A — Publico /quote/calculate (deve forcar off)")
    print("=" * 80)
    body_pub = {
        "produto_id": PRODUTO_ID,
        "configuracao": {
            **CONFIG_BASE,
            # Mesmo se mandar true, o backend forca pra false
            "incluir_fundacao": True,
            "incluir_projeto": True,
            "valor_projeto_override": 999.99,
        },
    }
    ok_a, resp_a = cenario("Publico (overrides forcados off)", "/api/public/quote/calculate", body_pub, 200)
    if isinstance(resp_a, dict) and resp_a.get("total"):
        # Confirma que NAO tem fundacao nem projeto override no resultado
        # (fundacao adicionaria itens com composicao_codigo=COMP00020)
        itens = resp_a.get("itens", [])
        fundacao_found = any(it.get("composicao_codigo") == "COMP00020" for it in itens)
        projeto_found = any(it.get("composicao_codigo") == "COMP00028" for it in itens)
        extras_found = bool(resp_a.get("extras"))
        if not fundacao_found and not projeto_found and not extras_found:
            print("  ✓ confirmado: nem fundacao, nem projeto, nem extras override no publico")
        else:
            print(f"  ✗ ATENCAO: fundacao={fundacao_found} projeto={projeto_found} extras={extras_found}")

    print()
    print("=" * 80)
    print("CENARIO B — Interno /quote/calculate sem auth (deve 401)")
    print("=" * 80)
    body_internal = {
        "produto_id": PRODUTO_ID,
        "configuracao": {**CONFIG_BASE, "incluir_fundacao": False, "incluir_projeto": False},
    }
    cenario("Interno sem auth", "/api/quote/calculate", body_internal, 401)

    print()
    print("=" * 80)
    print("CENARIO C — Interno SEM responder incluir_fundacao (mesmo se autenticasse, deveria 400)")
    print("=" * 80)
    print("  Nota: sem token admin, nao podemos chegar no validator. Skipping com auth.")
    print("  Validacao manual: na UI, botao Salvar fica desabilitado ate marcar Sim/Nao.")

    print()
    print("=" * 80)
    print("RESUMO")
    print("=" * 80)
    print(f"  Cenario A (publico): total = R$ {resp_a.get('total', 'erro') if isinstance(resp_a, dict) else 'erro'}")
    print()
    print("Cenarios D (com auth, fundacao=true e projeto override) ficam pra Etapa 11 — UI.")


if __name__ == "__main__":
    main()
