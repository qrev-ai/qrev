from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database (shared with Next.js / Prisma)
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/qrev"

    # Encryption key for stored credentials (32-byte hex string)
    credentials_encryption_key: str = ""

    # Redis (for Celery background tasks)
    redis_url: str = "redis://localhost:6379/0"

    # CORS - Next.js frontend origin
    frontend_url: str = "http://localhost:3000"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
