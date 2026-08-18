from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from api.routes import cats, servicos, dashboard
from core.database import engine, SessionLocal
from models.models import Base

# Cria as tabelas no banco se não existirem
Base.metadata.create_all(bind=engine)
try:
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE cats ADD COLUMN IF NOT EXISTS desmaterializado BOOLEAN NOT NULL DEFAULT TRUE"))
        connection.execute(text("ALTER TABLE cats ADD COLUMN IF NOT EXISTS autenticado BOOLEAN NOT NULL DEFAULT TRUE"))
        connection.execute(text("UPDATE cats SET desmaterializado = TRUE WHERE desmaterializado IS NULL"))
        connection.execute(text("UPDATE cats SET autenticado = TRUE WHERE autenticado IS NULL"))
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS unaccent"))
except Exception:
    # A busca também possui fallback sem a extensão.
    pass

try:
    from api.routes.cats import sync_all_cats_to_json
    with SessionLocal() as sync_db:
        sync_all_cats_to_json(sync_db)
except Exception:
    # O app continua iniciando mesmo se o diretório de backup estiver indisponível.
    pass

app = FastAPI(
    title="Sistema de Acervos Técnicos",
    description="API para gestão de CATs CREA e Atestados de Capacidade Técnica",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(cats.router, prefix="/api/v1")
app.include_router(servicos.router, prefix="/api/v1")

@app.get("/")
def root():
    return {"status": "ok", "message": "Sistema de Acervos Técnicos - API v1.0"}
