import enum
from datetime import datetime

from sqlalchemy import (
    String,
    Text,
    Float,
    Integer,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    JSON,
    Index,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


# ============================================
# Provider Credentials
# ============================================


class ProviderType(str, enum.Enum):
    LLM = "llm"
    EMAIL = "email"
    ENRICHMENT = "enrichment"


class ProviderCredential(Base):
    __tablename__ = "provider_credentials"

    id: Mapped[str] = mapped_column(String(30), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(String(30), index=True)

    provider_type: Mapped[ProviderType] = mapped_column(Enum(ProviderType))
    provider_id: Mapped[str] = mapped_column(String(50))  # "openai", "anthropic", etc.

    # Encrypted JSON blob: { apiKey, baseUrl, accessToken, refreshToken, ... }
    credentials_encrypted: Mapped[str] = mapped_column(Text)
    nonce: Mapped[str] = mapped_column(String(48))  # hex-encoded 24-byte nonce

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_valid: Mapped[bool] = mapped_column(Boolean, default=True)

    # LLM-specific
    preferred_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    monthly_budget: Mapped[float | None] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (
        Index("ix_provider_cred_workspace_provider", "workspace_id", "provider_id"),
    )


# ============================================
# Agent Tasks (coordination between agents)
# ============================================


class AgentTaskStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class AgentTask(Base):
    __tablename__ = "agent_tasks"

    id: Mapped[str] = mapped_column(String(30), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(String(30), index=True)
    session_id: Mapped[str] = mapped_column(String(30), index=True)

    parent_task_id: Mapped[str | None] = mapped_column(
        String(30), ForeignKey("agent_tasks.id"), nullable=True
    )
    parent_task: Mapped["AgentTask | None"] = relationship(
        back_populates="sub_tasks", remote_side="AgentTask.id"
    )
    sub_tasks: Mapped[list["AgentTask"]] = relationship(back_populates="parent_task")

    agent_id: Mapped[str] = mapped_column(String(50))  # "research", "email_writer", etc.
    status: Mapped[AgentTaskStatus] = mapped_column(
        Enum(AgentTaskStatus), default=AgentTaskStatus.PENDING
    )

    objective: Mapped[str] = mapped_column(Text)
    result: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Cost tracking
    tokens_used: Mapped[int] = mapped_column(Integer, default=0)
    model_used: Mapped[str | None] = mapped_column(String(100), nullable=True)
    cost_usd: Mapped[float] = mapped_column(Float, default=0.0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


# ============================================
# Agent Sessions
# ============================================


class AgentSession(Base):
    __tablename__ = "agent_sessions"

    id: Mapped[str] = mapped_column(String(30), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(String(30), index=True)
    agent_id: Mapped[str] = mapped_column(String(50))
    conversation_id: Mapped[str | None] = mapped_column(String(30), nullable=True)

    messages: Mapped[list] = mapped_column(JSON, default=list)
    session_metadata: Mapped[dict | None] = mapped_column("session_metadata", JSON, nullable=True)
    token_count: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


# ============================================
# Usage Logs (cost tracking)
# ============================================


class UsageLog(Base):
    __tablename__ = "usage_logs"

    id: Mapped[str] = mapped_column(String(30), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(String(30), index=True)

    provider_id: Mapped[str] = mapped_column(String(50))
    model: Mapped[str] = mapped_column(String(100))
    agent_id: Mapped[str] = mapped_column(String(50))
    task_id: Mapped[str | None] = mapped_column(String(30), nullable=True)

    input_tokens: Mapped[int] = mapped_column(Integer)
    output_tokens: Mapped[int] = mapped_column(Integer)
    cost_usd: Mapped[float] = mapped_column(Float)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_usage_workspace_created", "workspace_id", "created_at"),
    )
