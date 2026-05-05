"""Parse de DANFE/NF via Google Document AI (Invoice Parser).

Recebe bytes de imagem ou PDF e retorna estrutura sugerida com fornecedor +
itens, pra UI revisar e ajustar antes de salvar como compra.
"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)


def _ensure_credentials_env() -> None:
    """Garante que GOOGLE_APPLICATION_CREDENTIALS aponta pro arquivo correto.

    O caminho no .env e relativo a backend/, mas a lib do Google le da env var,
    entao precisamos resolver pra absoluto.
    """
    creds = settings.google_application_credentials
    if not creds:
        return
    if not Path(creds).is_absolute():
        # Resolve relativo ao diretorio do backend (onde a app eh executada)
        creds = str(Path.cwd() / creds)
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = creds


def _client_and_processor_path():
    """Retorna (client, processor_resource_path) para chamadas do Document AI."""
    from google.api_core.client_options import ClientOptions
    from google.cloud import documentai

    _ensure_credentials_env()
    if not settings.google_cloud_project or not settings.docai_processor_id:
        raise RuntimeError(
            "Document AI nao configurado: defina GOOGLE_CLOUD_PROJECT, "
            "DOCAI_LOCATION e DOCAI_PROCESSOR_ID no .env"
        )
    api_endpoint = f"{settings.docai_location}-documentai.googleapis.com"
    client = documentai.DocumentProcessorServiceClient(
        client_options=ClientOptions(api_endpoint=api_endpoint)
    )
    processor_path = client.processor_path(
        settings.google_cloud_project,
        settings.docai_location,
        settings.docai_processor_id,
    )
    return client, processor_path


def _money_to_float(text: str | None) -> float | None:
    """Converte 'R$ 1.234,56' ou '1234.56' em float."""
    if not text:
        return None
    s = text.strip().replace("R$", "").replace("BRL", "").strip()
    # Heuristica BR: se tem virgula, virgula e decimal e ponto e milhar
    if "," in s:
        s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def _qty_to_float(text: str | None) -> float | None:
    if not text:
        return None
    s = text.strip()
    if "," in s and "." in s:
        # 1.234,56 -> 1234.56
        s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def _entity_text(entity: Any) -> str:
    """Extrai texto normalizado ou raw da entidade."""
    nv = getattr(entity, "normalized_value", None)
    if nv and getattr(nv, "text", None):
        return nv.text
    return entity.mention_text or ""


def parse_nf_bytes(
    file_bytes: bytes, mime_type: str,
) -> dict[str, Any]:
    """Chama o Invoice Parser e devolve estrutura sugerida.

    Retorno:
      {
        "fornecedor": {"nome": str|None, "cnpj": str|None},
        "nota_fiscal": str|None,
        "data": str|None,
        "valor_total": float|None,
        "itens": [
          {"descricao": str, "sku_fornecedor": str|None,
           "quantidade": float|None, "unidade": str|None,
           "preco_unitario": float|None, "subtotal": float|None}
        ],
      }
    """
    from google.cloud import documentai

    client, processor_path = _client_and_processor_path()
    raw_doc = documentai.RawDocument(content=file_bytes, mime_type=mime_type)
    request = documentai.ProcessRequest(name=processor_path, raw_document=raw_doc)
    result = client.process_document(request=request)
    document = result.document

    entity_types = [e.type_ for e in document.entities]
    logger.warning(
        "DocAI parsed: bytes=%d mime=%s text_len=%d total_entities=%d types=%s",
        len(file_bytes), mime_type, len(document.text or ""),
        len(document.entities), entity_types,
    )

    fornecedor_nome = None
    fornecedor_cnpj = None
    nota_fiscal = None
    data = None
    valor_total = None
    itens: list[dict[str, Any]] = []

    for entity in document.entities:
        et = entity.type_
        text = _entity_text(entity)
        if et == "supplier_name":
            fornecedor_nome = text
        elif et in ("supplier_tax_id", "supplier_registration"):
            if not fornecedor_cnpj:
                fornecedor_cnpj = text
        elif et == "invoice_id":
            nota_fiscal = text
        elif et in ("invoice_date", "due_date"):
            if not data:
                data = text
        elif et == "total_amount":
            valor_total = _money_to_float(text)
        elif et == "line_item":
            item: dict[str, Any] = {
                "descricao": "",
                "sku_fornecedor": None,
                "quantidade": None,
                "unidade": None,
                "preco_unitario": None,
                "subtotal": None,
            }
            for prop in entity.properties:
                pt = prop.type_
                pv = _entity_text(prop)
                if pt == "line_item/description":
                    item["descricao"] = pv
                elif pt in ("line_item/product_code", "line_item/sku"):
                    item["sku_fornecedor"] = pv
                elif pt == "line_item/quantity":
                    item["quantidade"] = _qty_to_float(pv)
                elif pt in ("line_item/unit", "line_item/unit_of_measure"):
                    item["unidade"] = pv
                elif pt == "line_item/unit_price":
                    item["preco_unitario"] = _money_to_float(pv)
                elif pt == "line_item/amount":
                    item["subtotal"] = _money_to_float(pv)
            # Aceita só linhas com sinal de "compra real": qty e/ou preco.
            # Linhas com so descricao costumam ser titulos/impostos/observacoes.
            has_money = item["preco_unitario"] is not None or item["subtotal"] is not None
            has_qty = item["quantidade"] is not None
            if has_money or has_qty:
                itens.append(item)

    return {
        "fornecedor": {"nome": fornecedor_nome, "cnpj": fornecedor_cnpj},
        "nota_fiscal": nota_fiscal,
        "data": data,
        "valor_total": valor_total,
        "itens": itens,
    }
