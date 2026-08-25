import base64
import json
import re
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import requests
from pypdf import PdfReader, PdfWriter
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from core.config import settings
from core.database import SessionLocal, get_db
from models.models import Cat, IngestionJob, Servico
from models.schemas import CatUpdatePayload, IngestionApprovePayload, IngestionJobResponse

router = APIRouter(prefix="/ingestion", tags=["Ingestão"])

ROOT_DIR = Path(__file__).resolve().parents[3]
PROMPT_PATH = ROOT_DIR / "prompt_master_v2.txt"


class IngestionFailure(Exception):
    """Erro esperado do pipeline, exibido no histórico auditável do job."""


UPLOAD_DIR = ROOT_DIR / ".ingestion_uploads"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _safe_filename(filename: str) -> str:
    stem = Path(filename).stem
    suffix = Path(filename).suffix.lower() or ".pdf"
    stem = re.sub(r"[^\w\-. ]+", "_", stem, flags=re.UNICODE).strip(" .") or "documento"
    return f"{stem}_{int(time.time() * 1000)}{suffix}"


def _json_from_model(content: Any) -> dict:
    if isinstance(content, list):
        content = "".join(str(part) for part in content)
    if not isinstance(content, str):
        raise IngestionFailure("A resposta do modelo não veio como texto JSON.")
    cleaned = re.sub(r"^\s*```(?:json)?\s*|\s*```\s*$", "", content.strip(), flags=re.IGNORECASE)
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        cleaned = match.group(0)
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise IngestionFailure(f"O modelo devolveu um JSON inválido: {exc}") from exc
    if not isinstance(data, dict) or not isinstance(data.get("cat"), dict) or not isinstance(data.get("servicos"), list):
        raise IngestionFailure("O JSON precisa conter os blocos 'cat' e 'servicos'.")
    return data


def _load_prompt() -> str:
    if not PROMPT_PATH.is_file():
        raise IngestionFailure(f"Prompt mestre não encontrado em {PROMPT_PATH}.")
    return PROMPT_PATH.read_text(encoding="utf-8")


def _apelido_from_filename(filename: str, numero_cat: Optional[str]) -> str:
    stem = Path(filename).stem
    if numero_cat:
        stem = re.sub(re.escape(numero_cat), "", stem, flags=re.IGNORECASE)
    stem = re.sub(r"[_\-–]+", " ", stem).strip(" _-")
    return stem or "SEM_APELIDO"


def _append_log(db: Session, job: IngestionJob, level: str, message: str) -> None:
    logs = list(job.logs or [])
    logs.append({"timestamp": _now().isoformat(), "level": level, "message": message})
    job.logs = logs
    db.add(job)
    db.commit()


def _set_status(db: Session, job: IngestionJob, status: str, error_message: Optional[str] = None) -> None:
    job.status = status
    job.error_message = error_message
    if status == "processing":
        job.started_at = _now()
    if status in {"ready", "failed", "approved"}:
        job.finished_at = _now()
    db.add(job)
    db.commit()


def _call_openrouter(pdf_path: Path, prompt: str, pages_range: Optional[str] = None) -> dict:
    api_key = settings.OPENROUTER_API_KEY.strip()
    if not api_key:
        raise IngestionFailure("OPENROUTER_API_KEY não está configurada no backend/.env.")

    suffix = f"\n\nIMPORTANTE: Foque EXCLUSIVAMENTE na extração dos serviços que aparecem nas páginas {pages_range} do PDF. Ignore o restante para evitar que a resposta seja cortada." if pages_range else ""
    encoded = base64.b64encode(pdf_path.read_bytes()).decode("ascii")
    payload = {
        "model": settings.OPENROUTER_MODEL,
        "messages": [{"role": "user", "content": [
            {"type": "text", "text": prompt + suffix},
            {"type": "file", "file": {"filename": pdf_path.name, "file_data": f"data:application/pdf;base64,{encoded}"}},
        ]}],
        "response_format": {"type": "json_object"},
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/beasevla-hub/app_cats",
        "X-Title": "Acervo Técnico CATs",
    }
    try:
        response = requests.post(settings.OPENROUTER_URL, headers=headers, json=payload, timeout=300)
    except requests.RequestException as exc:
        raise IngestionFailure(f"Falha de comunicação com o OpenRouter: {exc}") from exc
    if response.status_code >= 400:
        detail = response.text[:800]
        raise IngestionFailure(f"OpenRouter respondeu HTTP {response.status_code}: {detail}")
    try:
        content = response.json()["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise IngestionFailure("A resposta do OpenRouter não contém choices[0].message.content.") from exc
    return _json_from_model(content)


def _extract_with_fallback(pdf_path: Path, prompt: str, log_fn) -> dict:
    if not settings.OPENROUTER_API_KEY.strip():
        raise IngestionFailure("OPENROUTER_API_KEY não está configurada no backend/.env.")
    log_fn("info", f"Enviando o PDF completo para {settings.OPENROUTER_MODEL}.")
    try:
        result = _call_openrouter(pdf_path, prompt)
        log_fn("success", f"Extração principal concluída: {len(result.get('servicos', []))} serviços encontrados.")
        return result
    except IngestionFailure as primary_error:
        log_fn("warning", f"Extração completa falhou: {primary_error}")
        log_fn("info", "Ativando fallback auditável em blocos reais de cinco páginas.")

    try:
        total_pages = len(PdfReader(str(pdf_path)).pages)
    except Exception as exc:
        raise IngestionFailure(f"Não foi possível ler o PDF para ativar o fallback: {exc}") from exc
    if total_pages == 0:
        raise IngestionFailure("O PDF não contém páginas para processar.")

    combined: Optional[dict] = None
    services: list[dict] = []
    with tempfile.TemporaryDirectory(prefix="app_cats_ingestion_") as temp_dir:
        for start_index in range(0, total_pages, 5):
            end_index = min(start_index + 5, total_pages)
            page_range = f"{start_index + 1} a {end_index}"
            chunk_path = Path(temp_dir) / f"pages_{start_index + 1}_{end_index}.pdf"
            try:
                reader = PdfReader(str(pdf_path))
                writer = PdfWriter()
                for page_index in range(start_index, end_index):
                    writer.add_page(reader.pages[page_index])
                with chunk_path.open("wb") as chunk_file:
                    writer.write(chunk_file)
                block = _call_openrouter(chunk_path, prompt, page_range)
            except (OSError, IngestionFailure) as block_error:
                log_fn("error", f"Bloco {page_range} falhou: {block_error}")
                break
            if combined is None:
                combined = block
            block_services = block.get("servicos", [])
            services.extend(block_services)
            log_fn("success", f"Bloco {page_range} concluído: {len(block_services)} serviços.")
            time.sleep(1)

    if combined is None:
        raise IngestionFailure("Não foi possível extrair o PDF no modo completo nem no fallback.")
    combined["servicos"] = services
    return combined


def _normalize_draft(data: dict, source_filename: str, source_path: Path) -> dict:
    cat = dict(data.get("cat") or {})
    numero_cat = cat.get("numero_cat")
    data["tipo_documento"] = data.get("tipo_documento") or "CAT"
    data["cat"] = cat
    data["servicos"] = list(data.get("servicos") or [])
    data["apelido"] = data.get("apelido") or _apelido_from_filename(source_filename, numero_cat)
    data["arquivo_pdf"] = data.get("arquivo_pdf") or source_filename
    data["caminho_pdf"] = data.get("caminho_pdf") or str(source_path.resolve())
    data["desmaterializado"] = bool(data.get("desmaterializado", True))
    data["autenticado"] = bool(data.get("autenticado", True))
    data["cao"] = bool(data.get("cao", True))
    return data


def _process_job(job_id: int, source_path: str) -> None:
    db = SessionLocal()
    job = db.query(IngestionJob).filter(IngestionJob.id == job_id).first()
    if not job:
        db.close()
        return

    def log(level: str, message: str) -> None:
        _append_log(db, job, level, message)

    try:
        _set_status(db, job, "processing")
        log("info", f"Job #{job.id} iniciado para {job.source_filename}.")
        pdf_path = Path(source_path)
        if not pdf_path.is_file():
            raise IngestionFailure("O PDF temporário não foi encontrado no backend.")
        log("info", f"Arquivo salvo em {pdf_path} ({pdf_path.stat().st_size / 1024 / 1024:.2f} MB).")
        result = _extract_with_fallback(pdf_path, _load_prompt(), log)
        draft = _normalize_draft(result, job.source_filename, pdf_path)
        job.draft_json = draft
        _set_status(db, job, "ready")
        log("success", "Rascunho pronto para revisão manual. Nada foi gravado no PostgreSQL ainda.")
    except Exception as exc:
        message = str(exc)
        _set_status(db, job, "failed", message)
        log("error", message)
    finally:
        db.close()


def _string(value: Any) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _draft_to_update_payload(draft: dict) -> CatUpdatePayload:
    cat = draft.get("cat") or {}
    return CatUpdatePayload(
        tipo_documento=draft.get("tipo_documento") or "CAT",
        numero_cat=_string(cat.get("numero_cat")),
        numero_art=_string(cat.get("numero_art")),
        profissional=_string(cat.get("profissional")),
        registro_crea=_string(cat.get("registro_crea")),
        empresa_contratada=_string(cat.get("empresa_contratada")),
        contratante=_string(cat.get("contratante")),
        cnpj_contratante=_string(cat.get("cnpj_contratante")),
        objeto=_string(cat.get("objeto")),
        processo_administrativo=_string(cat.get("processo_administrativo")),
        contrato=_string(cat.get("contrato")),
        endereco_obra=_string(cat.get("endereco_obra")),
        cidade=_string(cat.get("cidade")),
        estado=_string(cat.get("estado")),
        data_inicio=cat.get("data_inicio"),
        data_fim=cat.get("data_fim"),
        area_m2=cat.get("area_m2"),
        valor_contrato=cat.get("valor_contrato"),
        apelido=_string(draft.get("apelido")),
        arquivo_pdf=_string(draft.get("arquivo_pdf")),
        caminho_pdf=_string(draft.get("caminho_pdf")),
        desmaterializado=bool(draft.get("desmaterializado", True)),
        autenticado=bool(draft.get("autenticado", True)),
        cao=bool(draft.get("cao", True)),
        servicos=draft.get("servicos") or [],
    )


def _persist_draft(db: Session, draft: dict) -> Cat:
    from api.routes.cats import apply_cat_update

    payload = _draft_to_update_payload(draft)
    if not payload.numero_cat:
        raise HTTPException(status_code=422, detail="A revisão precisa informar o número da CAT antes de aprovar.")
    cat = db.query(Cat).filter(Cat.numero_cat == payload.numero_cat).first()
    if cat:
        return apply_cat_update(cat, payload, db)

    cat = Cat(
        tipo_documento=payload.tipo_documento or "CAT",
        numero_cat=payload.numero_cat,
        numero_art=payload.numero_art,
        profissional=payload.profissional,
        registro_crea=payload.registro_crea,
        empresa_contratada=payload.empresa_contratada,
        contratante=payload.contratante,
        cnpj_contratante=payload.cnpj_contratante,
        objeto=payload.objeto,
        processo_administrativo=payload.processo_administrativo,
        contrato=payload.contrato,
        endereco_obra=payload.endereco_obra,
        cidade=payload.cidade,
        estado=payload.estado,
        data_inicio=payload.data_inicio,
        data_fim=payload.data_fim,
        area_m2=payload.area_m2,
        valor_contrato=payload.valor_contrato,
        apelido=payload.apelido,
        arquivo_pdf=payload.arquivo_pdf,
        caminho_pdf=payload.caminho_pdf,
        desmaterializado=payload.desmaterializado if payload.desmaterializado is not None else True,
        autenticado=payload.autenticado if payload.autenticado is not None else True,
        cao=payload.cao if payload.cao is not None else True,
    )
    db.add(cat)
    db.flush()
    for service in payload.servicos:
        db.add(Servico(cat_id=cat.id, **service.model_dump()))
    cat.raw_json = draft
    db.add(cat)
    db.commit()
    db.refresh(cat)
    from api.routes.cats import write_json_snapshot
    write_json_snapshot(cat)
    return cat


@router.post("/jobs", response_model=IngestionJobResponse)
def create_job(background_tasks: BackgroundTasks, file: UploadFile = File(...), db: Session = Depends(get_db)):
    original_name = file.filename or "documento.pdf"
    if Path(original_name).suffix.lower() != ".pdf":
        raise HTTPException(status_code=400, detail="Selecione um arquivo PDF.")
    source_dir = UPLOAD_DIR
    source_dir.mkdir(parents=True, exist_ok=True)
    target = source_dir / _safe_filename(original_name)
    max_bytes = settings.INGESTION_MAX_FILE_MB * 1024 * 1024
    total = 0
    try:
        with target.open("wb") as output:
            while True:
                chunk = file.file.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > max_bytes:
                    target.unlink(missing_ok=True)
                    raise HTTPException(status_code=413, detail=f"O PDF excede o limite de {settings.INGESTION_MAX_FILE_MB} MB.")
                output.write(chunk)
    finally:
        file.file.close()

    job = IngestionJob(
        source_filename=original_name,
        source_path=str(target.resolve()),
        status="queued",
        logs=[{"timestamp": _now().isoformat(), "level": "info", "message": "PDF selecionado pelo menu do frontend e colocado na fila de ingestão."}],
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    background_tasks.add_task(_process_job, job.id, str(target.resolve()))
    return job


@router.get("/jobs", response_model=list[IngestionJobResponse])
def list_jobs(limit: int = 30, db: Session = Depends(get_db)):
    return db.query(IngestionJob).order_by(IngestionJob.created_at.desc()).limit(min(limit, 100)).all()


@router.get("/jobs/{job_id}", response_model=IngestionJobResponse)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(IngestionJob).filter(IngestionJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job de ingestão não encontrado.")
    return job


@router.post("/jobs/{job_id}/retry", response_model=IngestionJobResponse)
def retry_job(job_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    job = db.query(IngestionJob).filter(IngestionJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job de ingestão não encontrado.")
    if job.status not in {"failed", "queued"}:
        raise HTTPException(status_code=409, detail="Somente jobs falhos ou enfileirados podem ser reprocessados.")
    job.status = "queued"
    job.error_message = None
    job.finished_at = None
    db.add(job)
    db.commit()
    background_tasks.add_task(_process_job, job.id, job.source_path)
    return job


@router.post("/jobs/{job_id}/approve", response_model=IngestionJobResponse)
def approve_job(job_id: int, request: IngestionApprovePayload, db: Session = Depends(get_db)):
    job = db.query(IngestionJob).filter(IngestionJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job de ingestão não encontrado.")
    if job.status != "ready":
        raise HTTPException(status_code=409, detail="A ingestão precisa estar pronta para revisão antes da aprovação.")
    draft = request.payload.model_dump(mode="json")
    try:
        cat = _persist_draft(db, draft)
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Não foi possível persistir a CAT: {exc}") from exc
    job.status = "approved"
    job.approved_cat_id = cat.id
    job.draft_json = draft
    job.error_message = None
    db.add(job)
    db.commit()
    db.refresh(job)
    _append_log(db, job, "success", f"CAT {cat.numero_cat} aprovada e sincronizada no PostgreSQL e em outputs_json.")
    return job
