from __future__ import annotations

_SIZES = {
    "3x3": (3, 3),
    "3x6": (3, 6),
    "3x9": (3, 9),
}

# Standard opening sizes (metros). Alterar aqui muda Py e TS juntos via fixture.
_PORTA_AREAS = {
    "60x210": 0.60 * 2.10,  # 1.26
    "70x210": 0.70 * 2.10,  # 1.47
    "80x210": 0.80 * 2.10,  # 1.68
    "90x210": 0.90 * 2.10,  # 1.89
}
PORTA_ENTRADA_M2 = _PORTA_AREAS["90x210"]
PORTA_WC_M2 = _PORTA_AREAS["70x210"]
JANELA_PADRAO_M2 = 1.20 * 1.00  # janela de 1,20×1,00 m


def _porta_area(size: str) -> float:
    return _PORTA_AREAS.get(size, _PORTA_AREAS["80x210"])


def derive(config: dict) -> dict:
    tamanho = config["tamanho_modulo"]
    larg, comp = _SIZES[tamanho]
    qtd = int(config["qtd_modulos"])
    pe = float(config["pe_direito_m"])

    area_planta = larg * comp * qtd
    area_cobertura = area_planta

    # Plant-based perimeter if product carries it; otherwise falls back to a
    # heuristic (modules in line, sharing the shorter face).
    comp_ext_mod = config.get("planta_comp_paredes_ext_m")
    comp_int_mod = config.get("planta_comp_paredes_int_m")
    face_conexao = config.get("planta_face_conexao_m")

    if comp_ext_mod is not None and face_conexao is not None:
        perimetro = qtd * float(comp_ext_mod) - (qtd - 1) * 2 * float(face_conexao)
    else:
        perimetro = 2 * (comp * qtd) + 2 * larg

    if comp_int_mod is not None:
        comp_parede_interna = qtd * float(comp_int_mod)
    else:
        comp_parede_interna = (qtd - 1) * larg

    esq = config.get("esquadrias_extras") or {}
    portas_extras = int(esq.get("portas", 0))
    num_janelas = int(esq.get("janelas", 0))
    tamanhos_portas = list(esq.get("tamanhos_portas") or [])
    # pad with default 80×210 if fewer tamanhos than portas declared
    while len(tamanhos_portas) < portas_extras:
        tamanhos_portas.append("80x210")
    tamanhos_portas = tamanhos_portas[:portas_extras]

    area_portas_extras = sum(_porta_area(s) for s in tamanhos_portas)
    area_portas_ext = PORTA_ENTRADA_M2 + area_portas_extras
    area_janelas = num_janelas * JANELA_PADRAO_M2
    area_aberturas_ext = area_portas_ext + area_janelas

    area_fechamento_ext_bruta = perimetro * pe
    area_fechamento_ext = max(0.0, area_fechamento_ext_bruta - area_aberturas_ext)

    tem_wc = bool(config.get("tem_wc", False))
    area_porta_wc = PORTA_WC_M2 if tem_wc else 0.0
    area_parede_interna_bruta = comp_parede_interna * pe * 2
    # WC door removes the opening from both faces of the internal wall
    area_parede_interna = max(0.0, area_parede_interna_bruta - 2 * area_porta_wc)

    num_portas_ext = 1 + portas_extras

    return {
        "area_planta_m2": area_planta,
        "perimetro_externo_m": perimetro,
        "area_fechamento_ext_bruta_m2": round(area_fechamento_ext_bruta, 6),
        "area_fechamento_ext_m2": round(area_fechamento_ext, 6),
        "area_aberturas_ext_m2": round(area_aberturas_ext, 6),
        "area_cobertura_m2": area_cobertura,
        "comp_parede_interna_m": comp_parede_interna,
        "area_parede_interna_bruta_m2": round(area_parede_interna_bruta, 6),
        "area_parede_interna_m2": round(area_parede_interna, 6),
        "num_portas_ext": num_portas_ext,
        "num_janelas": num_janelas,
        "tem_wc": tem_wc,
        "num_splits": int(config.get("num_splits", 0)),
    }
