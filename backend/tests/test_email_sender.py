from app.services.email_sender import send_cliente_email, send_metalfort_notification


def test_dev_mode_writes_file(tmp_path, monkeypatch):
    monkeypatch.setattr("app.services.email_sender.DEV_OUTBOX", tmp_path)
    monkeypatch.setattr("app.config.settings.resend_api_key", "", raising=False)

    send_cliente_email(
        to="buyer@example.com", cliente_nome="João", numero="ORC-2026-0001",
        produto_nome="Farmácia 3×6", valor_total=10000.0, pdf_bytes=b"%PDF-1.4...",
    )
    files = list(tmp_path.iterdir())
    assert any("buyer@example.com" in f.name for f in files)


def test_dev_mode_notification(tmp_path, monkeypatch):
    monkeypatch.setattr("app.services.email_sender.DEV_OUTBOX", tmp_path)
    monkeypatch.setattr("app.config.settings.resend_api_key", "", raising=False)

    send_metalfort_notification(
        numero="ORC-2026-0001", cliente_nome="João", cliente_email="j@x.com",
        finalidade="farmacia", valor_total=10000.0, admin_url="http://localhost/admin",
    )
    assert len(list(tmp_path.iterdir())) == 1
