"""QREV Server — FastAPI backend for the GTM Agent Platform."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.session import engine
from app.db.models import Base
from app.campaigns.runner import campaign_runner
from app.telegram.bot import telegram_bot

from app.api.providers import router as providers_router
from app.api.chat import router as chat_router
from app.api.agents import router as agents_router
from app.api.usage import router as usage_router
from app.api.campaigns import router as campaigns_router
from app.api.telegram_admin import router as telegram_admin_router

logger = logging.getLogger("qrev")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (dev convenience — use Alembic migrations in prod)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Start background campaign runner
    campaign_runner.start()

    # Start Telegram bot (skips silently if token not configured)
    await telegram_bot.start(app)

    logger.info("QREV server started")

    yield

    # Shutdown
    await telegram_bot.stop()
    campaign_runner.stop()
    await engine.dispose()


app = FastAPI(
    title="QREV Server",
    description="GTM Agent Platform API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(providers_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(agents_router, prefix="/api")
app.include_router(usage_router, prefix="/api")
app.include_router(campaigns_router, prefix="/api")
app.include_router(telegram_admin_router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "qrev-server"}
