from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from ...core.database import get_db
from ...models.models import Cat, Servico
from ...models.schemas import DashboardStats

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_cats = db.query(func.count(Cat.id)).scalar()
    total_servicos = db.query(func.count(Servico.id)).scalar()
    total_contratantes = db.query(func.count(func.distinct(Cat.contratante))).scalar()
    area_total = db.query(func.coalesce(func.sum(Cat.area_m2), 0)).scalar()
    valor_total = db.query(func.coalesce(func.sum(Cat.valor_contrato), 0)).scalar()

    # CATs por ano
    cats_por_ano_raw = (
        db.query(
            extract("year", Cat.data_inicio).label("ano"),
            func.count(Cat.id).label("total")
        )
        .filter(Cat.data_inicio.isnot(None))
        .group_by("ano")
        .order_by("ano")
        .all()
    )
    cats_por_ano = [{"ano": int(r.ano), "total": r.total} for r in cats_por_ano_raw]

    # Top 10 grupos de serviços
    top_grupos_raw = (
        db.query(Servico.grupo, func.count(Servico.id).label("total"))
        .filter(Servico.grupo.isnot(None))
        .group_by(Servico.grupo)
        .order_by(func.count(Servico.id).desc())
        .limit(10)
        .all()
    )
    top_grupos = [{"grupo": r.grupo, "total": r.total} for r in top_grupos_raw]

    # Top 10 contratantes
    top_contratantes_raw = (
        db.query(Cat.contratante, func.count(Cat.id).label("total"))
        .filter(Cat.contratante.isnot(None))
        .group_by(Cat.contratante)
        .order_by(func.count(Cat.id).desc())
        .limit(10)
        .all()
    )
    top_contratantes = [{"contratante": r.contratante, "total": r.total} for r in top_contratantes_raw]

    return DashboardStats(
        total_cats=total_cats,
        total_servicos=total_servicos,
        total_contratantes=total_contratantes,
        area_total_m2=float(area_total),
        valor_total_contratos=float(valor_total),
        cats_por_ano=cats_por_ano,
        top_grupos=top_grupos,
        top_contratantes=top_contratantes,
    )
