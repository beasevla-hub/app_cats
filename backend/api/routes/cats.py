from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from ...core.database import get_db
from ...models.models import Cat, Servico
from ...models.schemas import CatResponse, CatDetalhe

router = APIRouter(prefix="/cats", tags=["CATs"])

@router.get("/", response_model=List[CatResponse])
def listar_cats(
    busca: Optional[str] = Query(None, description="Busca por apelido, contratante ou número"),
    contratante: Optional[str] = Query(None),
    cidade: Optional[str] = Query(None),
    ano_inicio: Optional[int] = Query(None),
    ano_fim: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Cat, func.count(Servico.id).label("total_servicos"))\
              .outerjoin(Servico, Cat.id == Servico.cat_id)\
              .group_by(Cat.id)

    if busca:
        termo = f"%{busca.upper()}%"
        query = query.filter(
            func.upper(Cat.apelido).like(termo) |
            func.upper(Cat.contratante).like(termo) |
            func.upper(Cat.numero_cat).like(termo) |
            func.upper(Cat.objeto).like(termo)
        )
    if contratante:
        query = query.filter(func.upper(Cat.contratante).like(f"%{contratante.upper()}%"))
    if cidade:
        query = query.filter(func.upper(Cat.cidade).like(f"%{cidade.upper()}%"))
    if ano_inicio:
        query = query.filter(func.extract("year", Cat.data_inicio) >= ano_inicio)
    if ano_fim:
        query = query.filter(func.extract("year", Cat.data_inicio) <= ano_fim)

    results = query.offset(skip).limit(limit).all()

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
