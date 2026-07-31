from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
import re
import unicodedata
from sqlalchemy import func
from typing import Optional, List
from core.database import get_db
from models.models import Cat, Servico
from models.schemas import PaginatedServicos, ServicoResponse

STOP_WORDS = {
    "A", "AS", "O", "OS", "DE", "DA", "DAS", "DO", "DOS", "E", "EM", "NO", "NA", "NOS", "NAS",
    "PARA", "POR", "COM", "SEM", "UM", "UMA", "AO", "AOS", "ATE", "ATÉ"
}

router = APIRouter(prefix="/servicos", tags=["Serviços"])


def build_description_search_terms(busca: str) -> list[str]:
    normalized = re.sub(r"\s+", " ", busca.strip())
    if not normalized:
        return []

    phrase_tokens = [token for token in normalized.split(" ") if len(token) >= 2]
    relevant_tokens = [token for token in phrase_tokens if token.upper() not in STOP_WORDS]
    return [normalized, *relevant_tokens] if relevant_tokens else [normalized, *phrase_tokens]


def canonical_unit(value: str | None) -> str | None:
    if value is None:
        return None

    normalized = unicodedata.normalize("NFKD", value)
    normalized = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    normalized = normalized.replace("²", "2").replace("³", "3").replace("×", "X")
    normalized = re.sub(r"\s+", "", normalized.upper())
    normalized = normalized.replace("/", "X")
    normalized = normalized.strip(".;:-")

    aliases = {
        "KG": "KG",
        "M": "M",
        "M2": "M2",
        "M3": "M3",
        "UN": "UN",
        "UNID": "UN",
        "UND": "UN",
        "UNIDADE": "UN",
        "CJ": "CJ",
        "CJTO": "CJ",
        "GL": "GL",
        "TON": "T",
        "T": "T",
        "MES": "MES",
        "MS": "MES",
        "M3XKM": "M3XKM",
        "M3XK": "M3XKM",
        "M3XK M": "M3XKM",
        "M3XKM": "M3XKM",
        "M3XKM": "M3XKM",
        "M3XMES": "M3XMES",
        "M2XMES": "M2XMES",
        "MXMES": "MXMES",
        "M2XKM": "M2XKM",
        "MXKM": "MXKM",
        "PC": "PC",
        "PÇ": "PC",
        "PCA": "PC",
    }

    return aliases.get(normalized, normalized or None)

@router.get("/", response_model=PaginatedServicos)
def listar_servicos(
    busca: Optional[str] = Query(None, description="Busca na descrição do serviço"),
    grupo: Optional[str] = Query(None),
    unidade: Optional[str] = Query(None),
    contratante: Optional[str] = Query(None),
    numero_cat: Optional[str] = Query(None),
    apelido: Optional[str] = Query(None),
    ano_inicio: Optional[int] = Query(None),
    ano_fim: Optional[int] = Query(None),
    ordenar_quantidade: Optional[str] = Query(None, pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    query = db.query(Servico).join(Cat, Servico.cat_id == Cat.id)

    if busca:
        termos = build_description_search_terms(busca)
        frase = termos[0]
        palavras = termos[1:] or [frase]
        if len(palavras) <= 1:
            query = query.filter(func.upper(Servico.descricao).like(f"%{frase.upper()}%"))
        for palavra in palavras:
            query = query.filter(func.upper(Servico.descricao).like(f"%{palavra.upper()}%"))
    if grupo:
        query = query.filter(func.upper(Servico.grupo).like(f"%{grupo.upper()}%"))
    if unidade:
        unidade_normalizada = canonical_unit(unidade)
        unidades_raw = db.query(Servico.unidade).filter(Servico.unidade.isnot(None)).all()
        candidatas = sorted({
            raw
            for (raw,) in unidades_raw
            if canonical_unit(raw) == unidade_normalizada
        })
        if candidatas:
            query = query.filter(Servico.unidade.in_(candidatas))
        else:
            query = query.filter(func.upper(Servico.unidade) == unidade.upper())
    if contratante:
        query = query.filter(func.upper(Cat.contratante).like(f"%{contratante.upper()}%"))
    if numero_cat:
        query = query.filter(Cat.numero_cat == numero_cat)
    if apelido:
        query = query.filter(func.upper(Cat.apelido).like(f"%{apelido.upper()}%"))
    if ano_inicio:
        query = query.filter(func.extract("year", Cat.data_inicio) >= ano_inicio)
    if ano_fim:
        query = query.filter(func.extract("year", Cat.data_inicio) <= ano_fim)

    if ordenar_quantidade == "desc":
        query = query.order_by(Servico.quantidade.desc().nullslast(), Servico.id.asc())
    elif ordenar_quantidade == "asc":
        query = query.order_by(Servico.quantidade.asc().nullslast(), Servico.id.asc())
    else:
        query = query.order_by(Servico.id.asc())

    total = query.count()
    offset = (page - 1) * page_size
    servicos_raw = query.options(joinedload(Servico.cat)).offset(offset).limit(page_size).all()

    items = []
    for s in servicos_raw:
        items.append(ServicoResponse(
            id=s.id,
            cat_id=s.cat_id,
            grupo=s.grupo,
            codigo=s.codigo,
            fonte=s.fonte,
            descricao=s.descricao,
            unidade=s.unidade,
            quantidade=s.quantidade,
            pagina_pdf=s.pagina_pdf,
            ordem_na_pagina=s.ordem_na_pagina,
            numero_cat=s.cat.numero_cat if s.cat else None,
            apelido=s.cat.apelido if s.cat else None,
            contratante=s.cat.contratante if s.cat else None,
            data_inicio=s.cat.data_inicio if s.cat else None,
            data_fim=s.cat.data_fim if s.cat else None,
        ))

    return PaginatedServicos(total=total, page=page, page_size=page_size, items=items)

@router.get("/grupos", response_model=List[str])
def listar_grupos(db: Session = Depends(get_db)):
    grupos = db.query(func.distinct(Servico.grupo))\
               .filter(Servico.grupo.isnot(None))\
               .order_by(Servico.grupo)\
               .all()
    return [g[0] for g in grupos]

@router.get("/unidades", response_model=List[str])
def listar_unidades(db: Session = Depends(get_db)):
    unidades = db.query(Servico.unidade)\
                 .filter(Servico.unidade.isnot(None))\
                 .all()

    normalizadas = sorted({
        unidade
        for (raw,) in unidades
        for unidade in [canonical_unit(raw)]
        if unidade
    })

    return normalizadas

@router.get("/somar")
def somar_quantitativos(
    descricao: str = Query(..., description="Descrição do serviço para somar"),
    unidade: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(
        Servico.unidade,
        func.sum(Servico.quantidade).label("total"),
        func.count(Servico.id).label("ocorrencias")
    ).join(Cat).filter(func.upper(Servico.descricao).like(f"%{descricao.upper()}%"))

    if unidade:
        query = query.filter(func.upper(Servico.unidade) == unidade.upper())

    resultado = query.group_by(Servico.unidade).all()
    return [{"unidade": r.unidade, "total": float(r.total or 0), "ocorrencias": r.ocorrencias} for r in resultado]
