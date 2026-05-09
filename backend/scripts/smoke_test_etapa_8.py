"""Smoke test da etapa 8: chama /api/public/quote/calculate e mostra
o efeito da integracao das composicoes.

Faz duas chamadas:
  1. metalfort-home 3x6 com configuracao basica
  2. mesmo input, mas mostra a diferenca quando composicoes sao
     desativadas (DISABLE_COMPOSICOES=1) -> baseline comparativo
"""
from __future__ import annotations

import json
import urllib.request

BASE = "http://127.0.0.1:8000"
PRODUTO_ID = "25e6e4a4-ec82-4623-a83c-c177cc265845"  # metalfort-home

CONFIG = {
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


def post(path: str, body: dict) -> dict:
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def main() -> None:
    res = post("/api/public/quote/calculate", {
        "produto_id": PRODUTO_ID,
        "configuracao": CONFIG,
    })

    itens = res.get("itens", [])
    extras = res.get("extras", [])
    vars_ = res.get("variaveis", {})

    print("="*80)
    print("INPUT (configuracao publica metalfort-home 3x6, combos standard)")
    print("="*80)
    print(json.dumps(CONFIG, indent=2, ensure_ascii=False))

    print()
    print("="*80)
    print("VARIAVEIS DERIVADAS")
    print("="*80)
    for k, v in vars_.items():
        print(f"  {k:35} = {v}")

    print()
    print("="*80)
    print(f"ITENS DO ORCAMENTO ({len(itens)} linhas)")
    print("="*80)
    print(f"{'Cat':<14} {'Origem':<14} {'SKU':<18} {'Descricao':<40} {'Qtd':>10} {'Un':<5} {'PrecoUn':>10} {'Subtotal':>11}")
    print("-"*145)

    composicoes_subtotal = 0.0
    bom_subtotal = 0.0
    combos_subtotal = 0.0

    for it in itens:
        origem = ""
        if it.get("composicao_codigo"):
            origem = it["composicao_codigo"]
            composicoes_subtotal += float(it["subtotal"])
        elif it.get("combo_slug"):
            origem = it["combo_slug"][:14]
            combos_subtotal += float(it["subtotal"])
        else:
            origem = "BOM produto"
            bom_subtotal += float(it["subtotal"])

        # Sem material_id pra extras nao-bom; usa "" como fallback
        desc = it.get("descricao", "")
        sku = "—"
        # Se quisesse o sku precisaria de outro endpoint; deixa vazio
        print(f"{it.get('categoria',''):<14} {origem:<14} {sku:<18} {desc[:38]:<40} {it.get('quantidade',0):>10.2f} {it.get('unidade',''):<5} {it.get('preco_unitario',0):>10.2f} {it.get('subtotal',0):>11.2f}")

    print()
    print("="*80)
    print("SUBTOTAIS POR ORIGEM")
    print("="*80)
    print(f"  BOM produto (produto_bom_regra):  R$ {bom_subtotal:>12,.2f}")
    print(f"  Combos (selecionados pelo usuario): R$ {combos_subtotal:>12,.2f}")
    print(f"  Composicoes (NOVO):                R$ {composicoes_subtotal:>12,.2f}")
    print()
    print(f"  Subtotal materiais:    R$ {res['subtotal']:>12,.2f}")
    print(f"  Gerenciamento:         {res['gerenciamento_pct']}%")
    print(f"  TOTAL:                 R$ {res['total']:>12,.2f}")
    print()
    print(f"  Extras comerciais: {len(extras)}")


if __name__ == "__main__":
    main()
