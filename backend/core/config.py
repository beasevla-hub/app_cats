from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:sua_senha@localhost:5432/acervos_db"
    ONEDRIVE_ROOT: str = r"C:\Users\win\THI Engenharia\THI - Documentos\Geral\THI 2026"
    SECRET_KEY: str = "troque-esta-chave-secreta-em-producao"
    SESSION_SECRET: str = "troque-esta-chave-de-sessao-em-producao"
    SESSION_COOKIE_SECURE: bool = False
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_URL: str = "https://openrouter.ai/api/v1/chat/completions"
    OPENROUTER_MODEL: str = "google/gemini-3.7-flash"
    INGESTION_MAX_FILE_MB: int = 50
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 horas

    class Config:
        env_file = ".env"

settings = Settings()
