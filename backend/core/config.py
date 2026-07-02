from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:sua_senha@localhost:5432/acervos_db"
    SECRET_KEY: str = "troque-esta-chave-secreta-em-producao"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 horas

    class Config:
        env_file = ".env"

settings = Settings()
