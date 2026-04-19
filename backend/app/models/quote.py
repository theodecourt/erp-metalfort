from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field


PortaSize = Literal["60x210", "70x210", "80x210", "90x210"]


class Caixilho(BaseModel):
    tipo: Literal["janela", "porta_vidro"]
    largura_m: float = Field(gt=0, le=10)
    altura_m: float = Field(gt=0, le=5)
    qtd: int = Field(ge=1, le=20)


class EsquadriasExtras(BaseModel):
    portas: int = Field(ge=0)
    tamanhos_portas: list[PortaSize] = Field(default_factory=list)
    caixilhos: list[Caixilho] = Field(default_factory=list)


class WcItens(BaseModel):
    pia_parede: bool = False
    pia_bancada: bool = False
    privada: bool = True
    chuveiro: bool = False


class ItemPersonalizado(BaseModel):
    material_id: str
    qtd: float = Field(gt=0)


class Configuracao(BaseModel):
    tamanho_modulo: Literal["3x3", "3x6", "3x9"]
    qtd_modulos: int = Field(ge=1, le=3)
    pe_direito_m: float = Field(ge=2.4, le=3.5)
    cor_externa: str | None = None
    pacote_acabamento: Literal["padrao", "premium", "personalizado"] = "padrao"
    itens_personalizados: list[ItemPersonalizado] = Field(default_factory=list)
    esquadrias_extras: EsquadriasExtras = EsquadriasExtras(portas=0)
    piso: Literal["vinilico", "ceramico", "porcelanato"] | None = "vinilico"
    tem_wc: bool = False
    wc_itens: WcItens = WcItens()
    num_splits: int = Field(ge=0, le=6, default=0)
    # User-controlled wall meterages (default from produto via backend merge)
    comp_paredes_ext_m: float | None = Field(default=None, ge=0)
    comp_paredes_int_m: float | None = Field(default=None, ge=0)


class CalculateRequest(BaseModel):
    produto_id: str
    configuracao: Configuracao


class SubmitRequest(BaseModel):
    produto_id: str
    configuracao: Configuracao
    cliente_nome: str = Field(min_length=2, max_length=200)
    cliente_email: EmailStr
    cliente_telefone: str | None = Field(default=None, max_length=40)
    finalidade: Literal["casa", "farmacia", "loja", "conveniencia", "escritorio", "quiosque", "outro"]


class QuoteItem(BaseModel):
    material_id: str
    descricao: str
    unidade: str
    quantidade: float
    preco_unitario: float
    subtotal: float
    tier: Literal["core", "addon"]
    categoria: str
    ordem: int


class QuoteResponse(BaseModel):
    itens: list[QuoteItem]
    variaveis: dict[str, Any]
    subtotal: float
    gerenciamento_pct: float
    total: float
