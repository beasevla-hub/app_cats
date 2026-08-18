from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

class ServicoBase(BaseModel):
    grupo: Optional[str] = None
    codigo: Optional[str] = None
    fonte: Optional[str] = None
    descricao: Optional[str] = None
    unidade: Optional[str] = None
    quantidade: Optional[float] = None
    pagina_pdf: Optional[int] = None
    ordem_na_pagina: Optional[int] = None

class ServicoResponse(ServicoBase):
    id: int
    cat_id: int
    # Campos da CAT pai para facilitar exibição na tabela
    numero_cat: Optional[str] = None
    apelido: Optional[str] = None
    contratante: Optional[str] = None
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    numero_art: Optional[str] = None
    arquivo_pdf: Optional[str] = None
    caminho_pdf: Optional[str] = None
    desmaterializado: Optional[bool] = True
    autenticado: Optional[bool] = True
    objeto: Optional[str] = None
    area_m2: Optional[float] = None
    valor_contrato: Optional[float] = None

    class Config:
        from_attributes = True

class CatBase(BaseModel):
    numero_cat: Optional[str] = None
    numero_art: Optional[str] = None
    profissional: Optional[str] = None
    registro_crea: Optional[str] = None
    empresa_contratada: Optional[str] = None
    contratante: Optional[str] = None
    cnpj_contratante: Optional[str] = None
    objeto: Optional[str] = None
    processo_administrativo: Optional[str] = None
    contrato: Optional[str] = None
    endereco_obra: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    area_m2: Optional[float] = None
    valor_contrato: Optional[float] = None
    apelido: Optional[str] = None
    arquivo_pdf: Optional[str] = None
    caminho_pdf: Optional[str] = None
    desmaterializado: Optional[bool] = True
    autenticado: Optional[bool] = True

class CatResponse(CatBase):
    id: int
    tipo_documento: Optional[str] = None
    created_at: Optional[datetime] = None
    total_servicos: Optional[int] = None

    class Config:
        from_attributes = True

class CatDetalhe(CatResponse):
    servicos: List[ServicoBase] = []


class CatUpdatePayload(BaseModel):
    tipo_documento: Optional[str] = None
    numero_cat: Optional[str] = None
    numero_art: Optional[str] = None
    profissional: Optional[str] = None
    registro_crea: Optional[str] = None
    empresa_contratada: Optional[str] = None
    contratante: Optional[str] = None
    cnpj_contratante: Optional[str] = None
    objeto: Optional[str] = None
    processo_administrativo: Optional[str] = None
    contrato: Optional[str] = None
    endereco_obra: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    area_m2: Optional[float] = None
    valor_contrato: Optional[float] = None
    apelido: Optional[str] = None
    arquivo_pdf: Optional[str] = None
    caminho_pdf: Optional[str] = None
    desmaterializado: Optional[bool] = True
    autenticado: Optional[bool] = True
    servicos: List[ServicoBase] = []

class DashboardStats(BaseModel):
    total_cats: int
    total_servicos: int
    total_contratantes: int
    area_total_m2: float
    valor_total_contratos: float
    cats_por_ano: List[dict]
    top_grupos: List[dict]
    top_contratantes: List[dict]

class PaginatedServicos(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[ServicoResponse]
