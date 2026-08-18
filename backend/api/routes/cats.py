import json
import os
import subprocess
from pathlib import Path
from typing import List, Optional
from datetime import date
import unicodedata

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from core.config import settings
from core.database import get_db
from models.models import Cat, Servico
from models.schemas import CatDetalhe, CatResponse, CatUpdatePayload

router = APIRouter(prefix="/cats", tags=["CATs"])

ROOT_DIR = Path(__file__).resolve().parents[3]
JSON_DIR = ROOT_DIR / "outputs_json"


def onedrive_root() -> Path:
    return Path(settings.ONEDRIVE_ROOT).expanduser()


def resolve_pdf_path(cat: Cat) -> Path:
    raw_path = cat.caminho_pdf or cat.arquivo_pdf
    if not raw_path:
        raise FileNotFoundError("Esta CAT não possui PDF vinculado")
    path = Path(raw_path)
    return path if path.is_absolute() else onedrive_root() / path


def normalize_text(value: Optional[str]) -> str:
    if not value:
        return ""
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch)).lower().strip()


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
        "arquivo_pdf": payload.arquivo_pdf or cat.arquivo_pdf,
        "caminho_pdf": payload.caminho_pdf or cat.caminho_pdf,
        "desmaterializado": payload.desmaterializado if payload.desmaterializado is not None else cat.desmaterializado,
        "autenticado": payload.autenticado if payload.autenticado is not None else cat.autenticado,
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
    payload_dict = build_payload_dict(cat, payload)
    try:
        json_path = find_json_path(cat)
    except FileNotFoundError:
        json_path = None

    if json_path:
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
    cat.arquivo_pdf = payload_dict["arquivo_pdf"]
    cat.caminho_pdf = payload_dict["caminho_pdf"]
    cat.desmaterializado = payload_dict["desmaterializado"]
    cat.autenticado = payload_dict["autenticado"]
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
    write_json_snapshot(cat)
    return cat


@router.get("", response_model=List[CatResponse])
@router.get("/", response_model=List[CatResponse])
def listar_cats(
    busca: Optional[str] = Query(None, description="Busca por apelido, contratante ou número"),
    objeto: Optional[str] = Query(None),
    contratante: Optional[str] = Query(None),
    cidade: Optional[str] = Query(None),
    numero_art: Optional[str] = Query(None),
    data_inicio_de: Optional[date] = Query(None),
    data_inicio_ate: Optional[date] = Query(None),
    data_fim_de: Optional[date] = Query(None),
    data_fim_ate: Optional[date] = Query(None),
    area_min: Optional[float] = Query(None),
    area_max: Optional[float] = Query(None),
    valor_min: Optional[float] = Query(None),
    valor_max: Optional[float] = Query(None),
    desmaterializado: Optional[bool] = Query(None),
    autenticado: Optional[bool] = Query(None),
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
        termo = normalize_text(busca)
        prefixo = termo if len(termo) < 5 else termo[:-1]
        query = query.filter(or_(
            func.lower(func.unaccent(Cat.apelido)).like(f"%{prefixo}%"),
            func.lower(func.unaccent(Cat.contratante)).like(f"%{prefixo}%"),
            func.lower(func.unaccent(Cat.numero_cat)).like(f"%{prefixo}%"),
            func.lower(func.unaccent(Cat.numero_art)).like(f"%{prefixo}%"),
            func.lower(func.unaccent(Cat.objeto)).like(f"%{prefixo}%"),
            func.lower(func.unaccent(Cat.cidade)).like(f"%{prefixo}%"),
        ))
    if contratante:
        query = query.filter(func.lower(func.unaccent(Cat.contratante)).like(f"%{normalize_text(contratante)}%"))
    if objeto:
        query = query.filter(func.lower(func.unaccent(Cat.objeto)).like(f"%{normalize_text(objeto)}%"))
    if cidade:
        query = query.filter(func.lower(func.unaccent(Cat.cidade)).like(f"%{normalize_text(cidade)}%"))
    if numero_art:
        query = query.filter(func.lower(func.unaccent(Cat.numero_art)).like(f"%{normalize_text(numero_art)}%"))
    if data_inicio_de:
        query = query.filter(Cat.data_inicio >= data_inicio_de)
    if data_inicio_ate:
        query = query.filter(Cat.data_inicio <= data_inicio_ate)
    if data_fim_de:
        query = query.filter(Cat.data_fim >= data_fim_de)
    if data_fim_ate:
        query = query.filter(Cat.data_fim <= data_fim_ate)
    if area_min is not None:
        query = query.filter(Cat.area_m2 >= area_min)
    if area_max is not None:
        query = query.filter(Cat.area_m2 <= area_max)
    if valor_min is not None:
        query = query.filter(Cat.valor_contrato >= valor_min)
    if valor_max is not None:
        query = query.filter(Cat.valor_contrato <= valor_max)
    if desmaterializado is not None:
        query = query.filter(Cat.desmaterializado == desmaterializado)
    if autenticado is not None:
        query = query.filter(Cat.autenticado == autenticado)

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


@router.post("/{cat_id}/choose-pdf", response_model=CatDetalhe)
def escolher_pdf_cat(cat_id: int, db: Session = Depends(get_db)):
    cat = db.query(Cat).filter(Cat.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="CAT não encontrada")
    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        selected_path = filedialog.askopenfilename(
            title=f"Selecionar PDF da CAT {cat.numero_cat or cat_id}",
            filetypes=[("Arquivos PDF", "*.pdf"), ("Todos os arquivos", "*.*")],
        )
        root.destroy()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="O seletor nativo só está disponível quando o backend roda em uma sessão Windows com área de trabalho.") from exc
    if not selected_path:
        return cat
    selected = Path(selected_path)
    if selected.suffix.lower() != ".pdf":
        raise HTTPException(status_code=400, detail="Selecione um arquivo PDF")
    cat.arquivo_pdf = selected.name
    try:
        cat.caminho_pdf = str(selected.relative_to(onedrive_root()))
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Selecione um PDF dentro da raiz configurada do OneDrive: {settings.ONEDRIVE_ROOT}")
    cat.raw_json = update_json_snapshot(cat)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    write_json_snapshot(cat)
    return cat


def update_json_snapshot(cat: Cat) -> dict:
    snapshot = dict(cat.raw_json or {})
    snapshot["arquivo_pdf"] = cat.arquivo_pdf
    snapshot["caminho_pdf"] = cat.caminho_pdf
    snapshot["desmaterializado"] = cat.desmaterializado
    snapshot["autenticado"] = cat.autenticado
    return snapshot


def write_json_snapshot(cat: Cat) -> None:
    try:
        json_path = find_json_path(cat)
    except FileNotFoundError:
        JSON_DIR.mkdir(parents=True, exist_ok=True)
        json_path = JSON_DIR / f"CAT_{cat.numero_cat or cat.id}.json"
    snapshot = update_json_snapshot(cat)
    with json_path.open("w", encoding="utf-8") as handle:
        json.dump(snapshot, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def sync_all_cats_to_json(db: Session) -> int:
    cats = db.query(Cat).all()
    for cat in cats:
        write_json_snapshot(cat)
    return len(cats)


@router.post("/sync-json")
def sincronizar_jsons(db: Session = Depends(get_db)):
    return {"sincronizadas": sync_all_cats_to_json(db)}


@router.get("/{cat_id}/pdf")
def visualizar_pdf(cat_id: int, db: Session = Depends(get_db)):
    cat = db.query(Cat).filter(Cat.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="CAT não encontrada")
    try:
        pdf_path = resolve_pdf_path(cat)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    if not pdf_path.is_file():
        raise HTTPException(status_code=404, detail="Arquivo PDF não encontrado na raiz do OneDrive")
    return FileResponse(path=pdf_path, media_type="application/pdf", filename=cat.arquivo_pdf or pdf_path.name, content_disposition_type="inline")


@router.post("/{cat_id}/open-pdf")
def abrir_pdf_local(cat_id: int, db: Session = Depends(get_db)):
    cat = db.query(Cat).filter(Cat.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="CAT não encontrada")
    try:
        pdf_path = resolve_pdf_path(cat)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    if not pdf_path.is_file():
        raise HTTPException(status_code=404, detail=f"Arquivo PDF não encontrado: {pdf_path}")
    try:
        if os.name == "nt":
            os.startfile(str(pdf_path))
        else:
            subprocess.Popen(["xdg-open", str(pdf_path)])
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Não foi possível abrir o PDF no programa padrão do sistema") from exc
    return {"aberto": True, "caminho": str(pdf_path)}


@router.put("/{cat_id}", response_model=CatDetalhe)
def atualizar_cat(cat_id: int, payload: CatUpdatePayload, db: Session = Depends(get_db)):
    cat = db.query(Cat).filter(Cat.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="CAT não encontrada")

    try:
        return apply_cat_update(cat, payload, db)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
