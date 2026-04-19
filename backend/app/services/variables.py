from __future__ import annotations

_SIZES = {
    "3x3": (3, 3),
    "3x6": (3, 6),
    "3x9": (3, 9),
}

_PORTA_AREAS = {
    "60x210": 0.60 * 2.10,
    "70x210": 0.70 * 2.10,
    "80x210": 0.80 * 2.10,
    "90x210": 0.90 * 2.10,
}
PORTA_ENTRADA_M2 = _PORTA_AREAS["90x210"]
PORTA_WC_M2 = _PORTA_AREAS["70x210"]


def _porta_area(size: str) -> float:
    return _PORTA_AREAS.get(size, _PORTA_AREAS["80x210"])


def derive(config: dict) -> dict:
    tamanho = config["tamanho_modulo"]
    larg, comp = _SIZES[tamanho]
    qtd = int(config["qtd_modulos"])
    pe = float(config["pe_direito_m"])

    area_planta = larg * comp * qtd
    area_cobertura = area_planta

    comp_ext = config.get("comp_paredes_ext_m")
    comp_int = config.get("comp_paredes_int_m")

    # Legacy fallback for callers that don't set the wall meterages directly:
    # external = footprint perimeter, internal = shared face between modules.
    perimetro = float(comp_ext) if comp_ext is not None else (2 * (comp * qtd) + 2 * larg)
    comp_parede_interna = float(comp_int) if comp_int is not None else ((qtd - 1) * larg)

    esq = config.get("esquadrias_extras") or {}
    portas_extras = int(esq.get("portas", 0))
    tamanhos_portas = list(esq.get("tamanhos_portas") or [])
    while len(tamanhos_portas) < portas_extras:
        tamanhos_portas.append("80x210")
    tamanhos_portas = tamanhos_portas[:portas_extras]

    area_portas_extras = sum(_porta_area(s) for s in tamanhos_portas)
    area_portas_ext = PORTA_ENTRADA_M2 + area_portas_extras

    caixilhos = list(esq.get("caixilhos") or [])
    area_caixilhos = 0.0
    num_janelas = 0
    num_portas_vidro = 0
    for c in caixilhos:
        area_caixilhos += float(c.get("largura_m", 0)) * float(c.get("altura_m", 0)) * int(c.get("qtd", 0))
        if c.get("tipo") == "janela":
            num_janelas += int(c.get("qtd", 0))
        elif c.get("tipo") == "porta_vidro":
            num_portas_vidro += int(c.get("qtd", 0))

    area_aberturas_ext = area_portas_ext + area_caixilhos

    area_fechamento_ext_bruta = perimetro * pe
    area_fechamento_ext = max(0.0, area_fechamento_ext_bruta - area_aberturas_ext)

    tem_wc = bool(config.get("tem_wc", False))
    area_porta_wc = PORTA_WC_M2 if tem_wc else 0.0
    area_parede_interna_bruta = comp_parede_interna * pe * 2
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
        "num_portas_vidro": num_portas_vidro,
        "tem_wc": tem_wc,
        "num_splits": int(config.get("num_splits", 0)),
    }
