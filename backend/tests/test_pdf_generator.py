import pytest

try:
    from app.services.pdf_generator import render_quote_pdf
except (ImportError, OSError) as exc:
    pytest.skip(
        f"WeasyPrint native deps unavailable ({exc}); run `brew install pango` (macOS) "
        "or `apt install libpango-1.0-0 libpangoft2-1.0-0` (Linux).",
        allow_module_level=True,
    )


def test_render_quote_pdf_returns_pdf_bytes():
    orcamento = {
        "numero": "ORC-2026-0001",
        "cliente_nome": "Teste Cliente",
        "cliente_email": "teste@example.com",
        "finalidade": "farmacia",
        "valor_subtotal": 100.0,
        "valor_total": 108.0,
        "valor_gerenciamento_pct": 8.0,
    }
    produto = {"nome": "Farmácia Express 3×6"}
    itens = [
        {"descricao": "Perfil LSF", "unidade": "kg", "quantidade": 540.0,
         "preco_unitario": 14.0, "subtotal": 7560.0}
    ]

    pdf = render_quote_pdf(orcamento, produto, itens, resumo_config="3x6 / 1 módulo / 2,70m")
    assert pdf[:4] == b"%PDF"
    assert len(pdf) > 1000
