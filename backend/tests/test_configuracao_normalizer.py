"""Tests for legacy -> novo configuracao adapter."""
from app.services.configuracao_normalizer import normalize_configuracao


# Sample template_selections returned by repository.get_templates_by_slug (mock shape).
BASICO_SELECOES = {
    "fechamento_ext": "fechamento-standard",
    "cobertura": "cobertura-standard",
    "forro": "forro-standard",
    "divisoria": "divisoria-simples",
    "piso": "piso-vinilico",
    "subpiso": "subpiso-seco",
    "vidro": "vidro-simples",
}
PREMIUM_SELECOES = {
    "fechamento_ext": "fechamento-premium",
    "cobertura": "cobertura-termica",
    "forro": "forro-acustico",
    "divisoria": "divisoria-acustica",
    "piso": "piso-porcelanato",
    "subpiso": "subpiso-seco",
    "vidro": "vidro-duplo",
}
TEMPLATES_BY_SLUG = {"basico": BASICO_SELECOES, "premium": PREMIUM_SELECOES}


def test_normalize_legacy_pacote_padrao_maps_to_basico():
    config = {
        "tamanho_modulo": "3x6",
        "qtd_modulos": 1,
        "pe_direito_m": 2.7,
        "pacote_acabamento": "padrao",
        "tem_wc": False,
    }
    result = normalize_configuracao(config, templates=TEMPLATES_BY_SLUG)
    assert result["combos"] == BASICO_SELECOES
    assert result["template_aplicado"] == "basico"


def test_normalize_legacy_pacote_premium_maps_to_premium():
    config = {
        "tamanho_modulo": "3x9",
        "qtd_modulos": 1,
        "pe_direito_m": 3.0,
        "pacote_acabamento": "premium",
        "tem_wc": True,
    }
    result = normalize_configuracao(config, templates=TEMPLATES_BY_SLUG)
    # Premium selections + auto divisoria_wc when tem_wc
    assert result["combos"]["fechamento_ext"] == "fechamento-premium"
    assert result["combos"]["cobertura"] == "cobertura-termica"
    assert result["template_aplicado"] == "premium"
    assert result["combos"].get("divisoria_wc") == "divisoria-umida"


def test_normalize_legacy_pacote_personalizado_uses_basico_defaults():
    config = {
        "tamanho_modulo": "3x6",
        "qtd_modulos": 1,
        "pe_direito_m": 2.7,
        "pacote_acabamento": "personalizado",
        "tem_wc": False,
    }
    result = normalize_configuracao(config, templates=TEMPLATES_BY_SLUG)
    assert result["combos"] == BASICO_SELECOES
    assert result["template_aplicado"] == "personalizado"


def test_normalize_new_shape_passes_through():
    config = {
        "tamanho_modulo": "3x6",
        "qtd_modulos": 1,
        "pe_direito_m": 2.7,
        "combos": {"fechamento_ext": "fechamento-acustico", "cobertura": "cobertura-standard"},
        "template_aplicado": "personalizado",
        "tem_wc": False,
    }
    result = normalize_configuracao(config, templates=TEMPLATES_BY_SLUG)
    assert result["combos"]["fechamento_ext"] == "fechamento-acustico"
    assert result["template_aplicado"] == "personalizado"


def test_normalize_wc_true_injects_divisoria_wc():
    config = {
        "tamanho_modulo": "3x6",
        "qtd_modulos": 1,
        "pe_direito_m": 2.7,
        "combos": {"fechamento_ext": "fechamento-standard"},
        "tem_wc": True,
    }
    result = normalize_configuracao(config, templates=TEMPLATES_BY_SLUG)
    assert result["combos"]["divisoria_wc"] == "divisoria-umida"


def test_normalize_wc_false_drops_divisoria_wc():
    config = {
        "tamanho_modulo": "3x6",
        "qtd_modulos": 1,
        "pe_direito_m": 2.7,
        "combos": {
            "fechamento_ext": "fechamento-standard",
            "divisoria_wc": "divisoria-umida",
        },
        "tem_wc": False,
    }
    result = normalize_configuracao(config, templates=TEMPLATES_BY_SLUG)
    assert "divisoria_wc" not in result["combos"]


def test_normalize_empty_config_falls_back_to_basico():
    config = {
        "tamanho_modulo": "3x6",
        "qtd_modulos": 1,
        "pe_direito_m": 2.7,
        "tem_wc": False,
    }
    result = normalize_configuracao(config, templates=TEMPLATES_BY_SLUG)
    assert result["combos"] == BASICO_SELECOES
    assert result["template_aplicado"] == "basico"
