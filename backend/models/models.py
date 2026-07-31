from sqlalchemy import Column, Integer, String, Float, Date, Text, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base

class Cat(Base):
    __tablename__ = "cats"

    id = Column(Integer, primary_key=True, index=True)
    tipo_documento = Column(String, default="CAT")
    numero_cat = Column(String, unique=True, index=True)
    numero_art = Column(String, nullable=True)
    profissional = Column(String, nullable=True)
    registro_crea = Column(String, nullable=True)
    empresa_contratada = Column(String, nullable=True)
    contratante = Column(String, nullable=True)
    cnpj_contratante = Column(String, nullable=True)
    objeto = Column(Text, nullable=True)
    processo_administrativo = Column(String, nullable=True)
    contrato = Column(String, nullable=True)
    endereco_obra = Column(String, nullable=True)
    cidade = Column(String, nullable=True)
    estado = Column(String, nullable=True)
    data_inicio = Column(Date, nullable=True)
    data_fim = Column(Date, nullable=True)
    area_m2 = Column(Float, nullable=True)
    valor_contrato = Column(Float, nullable=True)
    apelido = Column(String, nullable=True)
    arquivo_pdf = Column(String, nullable=True)
    caminho_pdf = Column(String, nullable=True)
    raw_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    servicos = relationship("Servico", back_populates="cat", cascade="all, delete-orphan")


class Servico(Base):
    __tablename__ = "servicos"

    id = Column(Integer, primary_key=True, index=True)
    cat_id = Column(Integer, ForeignKey("cats.id"), nullable=False, index=True)
    grupo = Column(String, nullable=True, index=True)
    codigo = Column(String, nullable=True)
    fonte = Column(String, nullable=True)
    descricao = Column(Text, nullable=True, index=True)
    unidade = Column(String, nullable=True)
    quantidade = Column(Float, nullable=True)
    pagina_pdf = Column(Integer, nullable=True)
    ordem_na_pagina = Column(Integer, nullable=True)

    cat = relationship("Cat", back_populates="servicos")
