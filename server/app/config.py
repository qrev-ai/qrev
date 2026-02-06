from pathlib import Path

from pydantic_settings import BaseSettings

# Look for .env in server/ first, then in parent qrev/ directory
_server_dir = Path(__file__).resolve().parent.parent
_env_files = [
    _server_dir / ".env",          # server/.env (Docker)
    _server_dir.parent / ".env",   # qrev/.env (local dev)
]
_env_file = next((f for f in _env_files if f.exists()), ".env")


class Settings(BaseSettings):
    # Database (shared with Next.js / Prisma)
    # Accepts either postgresql:// (Prisma format) or postgresql+asyncpg://
    database_url: str = "postgresql+asyncpg://qrev:qrev@localhost:5432/qrev"

    # Encryption key for stored credentials (32-byte hex string)
    credentials_encryption_key: str = ""

    # CORS - Next.js frontend origin
    frontend_url: str = "http://localhost:3000"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True

    # Telegram bot
    telegram_bot_token: str = ""
    telegram_bot_username: str = ""
    telegram_webhook_url: str = ""        # empty = polling mode
    telegram_webhook_secret: str = ""

    model_config = {"env_file": str(_env_file), "env_file_encoding": "utf-8"}

    @property
    def async_database_url(self) -> str:
        """Return the database URL with asyncpg driver for SQLAlchemy."""
        url = self.database_url
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url


settings = Settings()
