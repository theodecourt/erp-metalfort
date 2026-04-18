from __future__ import annotations

_SIZES = {
    "3x3": (3, 3),
    "3x6": (3, 6),
    "3x9": (3, 9),
}


def derive(config: dict) -> dict:
    tamanho = config["tamanho_modulo"]
    larg, comp = _SIZES[tamanho]
    qtd = int(config["qtd_modulos"])
    pe = float(config["pe_direito_m"])

    # Modules placed in line, sharing the 3m wall between them.
    area_planta = larg * comp * qtd
    # Perímetro: 2×(comp×qtd) + 2×larg
    perimetro = 2 * (comp * qtd) + 2 * larg
    area_fechamento_ext = round(perimetro * pe, 6)
    area_cobertura = area_planta  # drenagem pelos pilares

    comp_parede_interna = (qtd - 1) * larg
    area_parede_interna = round(comp_parede_interna * pe * 2, 6)

    esq = config.get("esquadrias_extras", {"portas": 0, "janelas": 0})
    num_portas_ext = 1 + int(esq.get("portas", 0))
    num_janelas = int(esq.get("janelas", 0))

    return {
        "area_planta_m2": area_planta,
        "perimetro_externo_m": perimetro,
        "area_fechamento_ext_m2": area_fechamento_ext,
        "area_cobertura_m2": area_cobertura,
        "comp_parede_interna_m": comp_parede_interna,
        "area_parede_interna_m2": area_parede_interna,
        "num_portas_ext": num_portas_ext,
        "num_janelas": num_janelas,
        "tem_wc": bool(config.get("tem_wc", False)),
        "num_splits": int(config.get("num_splits", 0)),
    }
