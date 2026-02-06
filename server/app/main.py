"""QREV Server — FastAPI backend for the GTM Agent Platform."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.session import engine
from app.db.models import Base

from app.api.providers import router as providers_router
from app.api.chat import router as chat_router
from app.api.agents import router as agents_router
from app.api.usage import router as usage_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (dev convenience — use Alembic migrations in prod)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
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


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "qrev-server"}
