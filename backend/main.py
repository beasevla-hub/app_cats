from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import cats, servicos, dashboard
from core.database import engine
from models.models import Base

# Cria as tabelas no banco se não existirem
Base.metadata.create_all(bind=engine)

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
