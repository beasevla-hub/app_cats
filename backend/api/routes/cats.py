from datetime import date
import json
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from core.database import get_db
from models.models import Cat, Servico
from models.schemas import CatDetalhe, CatResponse, CatUpdatePayload

router = APIRouter(prefix="/cats", tags=["CATs"])

ROOT_DIR = Path(__file__).resolve().parents[3]
JSON_DIR = ROOT_DIR / "outputs_json"


def format_date(value: Optional[date]) -> Optional[str]:
    return value.isoformat() if value else None


def find_json_path(cat: Cat) -> Path:
    if cat.numero_cat:
        matches = sorted(JSON_DIR.glob(f"*_{cat.numero_cat}.json"))
        if matches:
            return matches[0]
    raise FileNotFoundError("Arquivo JSON da CAT não encontrado")


def build_payload_dict(cat: Cat, payload: CatUpdatePayload) -> dict:
    return {
        "tipo_documento": payload.tipo_documento or cat.tipo_documento,
        "cat": {
            "numero_cat": payload.numero_cat or cat.numero_cat,
            "numero_art": payload.numero_art,
            "profissional": payload.profissional,
            "registro_crea": payload.registro_crea,
            "empresa_contratada": payload.empresa_contratada,
            "contratante": payload.contratante,
            "cnpj_contratante": payload.cnpj_contratante,
            "objeto": payload.objeto,
            "processo_administrativo": payload.processo_administrativo,
            "contrato": payload.contrato,
            "endereco_obra": payload.endereco_obra,
            "cidade": payload.cidade,
            "estado": payload.estado,
            "data_inicio": format_date(payload.data_inicio),
            "data_fim": format_date(payload.data_fim),
            "area_m2": payload.area_m2,
            "valor_contrato": payload.valor_contrato,
        },
        "servicos": [
            {
                "grupo": servico.grupo,
                "codigo": servico.codigo,
                "fonte": servico.fonte,
                "descricao": servico.descricao,
                "unidade": servico.unidade,
                "quantidade": servico.quantidade,
                "pagina_pdf": servico.pagina_pdf,
                "ordem_na_pagina": servico.ordem_na_pagina,
            }
            for servico in payload.servicos
        ],
        "apelido": payload.apelido,
    }


def apply_cat_update(cat: Cat, payload: CatUpdatePayload, db: Session) -> Cat:
    json_path = find_json_path(cat)
    payload_dict = build_payload_dict(cat, payload)

    with json_path.open("w", encoding="utf-8") as handle:
        json.dump(payload_dict, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    cat.tipo_documento = payload_dict["tipo_documento"]
    cat.numero_cat = payload_dict["cat"]["numero_cat"]
    cat.numero_art = payload.numero_art
    cat.profissional = payload.profissional
    cat.registro_crea = payload.registro_crea
    cat.empresa_contratada = payload.empresa_contratada
    cat.contratante = payload.contratante
    cat.cnpj_contratante = payload.cnpj_contratante
    cat.objeto = payload.objeto
    cat.processo_administrativo = payload.processo_administrativo
    cat.contrato = payload.contrato
    cat.endereco_obra = payload.endereco_obra
    cat.cidade = payload.cidade
    cat.estado = payload.estado
    cat.data_inicio = payload.data_inicio
    cat.data_fim = payload.data_fim
    cat.area_m2 = payload.area_m2
    cat.valor_contrato = payload.valor_contrato
    cat.apelido = payload.apelido
    cat.raw_json = payload_dict

    db.query(Servico).filter(Servico.cat_id == cat.id).delete()
    for servico in payload.servicos:
        db.add(
            Servico(
                cat_id=cat.id,
                grupo=servico.grupo,
                codigo=servico.codigo,
                fonte=servico.fonte,
                descricao=servico.descricao,
                unidade=servico.unidade,
                quantidade=servico.quantidade,
                pagina_pdf=servico.pagina_pdf,
                ordem_na_pagina=servico.ordem_na_pagina,
            )
        )

    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.get("/", response_model=List[CatResponse])
def listar_cats(
    busca: Optional[str] = Query(None, description="Busca por apelido, contratante ou número"),
    objeto: Optional[str] = Query(None),
    contratante: Optional[str] = Query(None),
    cidade: Optional[str] = Query(None),
    ano_inicio: Optional[int] = Query(None),
    ano_fim: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = (
        db.query(Cat, func.count(Servico.id).label("total_servicos"))
        .outerjoin(Servico, Cat.id == Servico.cat_id)
        .group_by(Cat.id)
    )

    if busca:
        termo = f"%{busca.upper()}%"
        query = query.filter(
            func.upper(Cat.apelido).like(termo)
            | func.upper(Cat.contratante).like(termo)
            | func.upper(Cat.numero_cat).like(termo)
            | func.upper(Cat.objeto).like(termo)
        )
    if contratante:
        query = query.filter(func.upper(Cat.contratante).like(f"%{contratante.upper()}%"))
    if objeto:
        query = query.filter(func.upper(Cat.objeto).like(f"%{objeto.upper()}%"))
    if cidade:
        query = query.filter(func.upper(Cat.cidade).like(f"%{cidade.upper()}%"))
    if ano_inicio:
        query = query.filter(func.extract("year", Cat.data_inicio) >= ano_inicio)
    if ano_fim:
        query = query.filter(func.extract("year", Cat.data_inicio) <= ano_fim)

    results = query.order_by(Cat.data_inicio.desc().nullslast(), Cat.id.desc()).offset(skip).limit(limit).all()

    cats = []
    for cat, total in results:
        cat_dict = {c.name: getattr(cat, c.name) for c in cat.__table__.columns}
        cat_dict["total_servicos"] = total
        cats.append(CatResponse(**cat_dict))

    return cats


@router.get("/{cat_id}", response_model=CatDetalhe)
def detalhe_cat(cat_id: int, db: Session = Depends(get_db)):
    cat = db.query(Cat).filter(Cat.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="CAT não encontrada")
    return cat


@router.get("/numero/{numero_cat}", response_model=CatDetalhe)
def detalhe_cat_por_numero(numero_cat: str, db: Session = Depends(get_db)):
    cat = db.query(Cat).filter(Cat.numero_cat == numero_cat).first()
    if not cat:
        raise HTTPException(status_code=404, detail="CAT não encontrada")
    return cat


@router.put("/{cat_id}", response_model=CatDetalhe)
def atualizar_cat(cat_id: int, payload: CatUpdatePayload, db: Session = Depends(get_db)):
    cat = db.query(Cat).filter(Cat.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="CAT não encontrada")

    try:
        return apply_cat_update(cat, payload, db)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
