"""Chat API — streaming chat with QAi orchestrator via SSE."""

import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import ProviderCredential, ProviderType
from app.providers.credentials import decrypt_credentials
from app.providers.llm.types import ChatMessage

from app.agents.orchestrator import QAiOrchestrator
from app.agents.types import AgentContext

router = APIRouter(prefix="/chat", tags=["chat"])

# Import agents so they register themselves
import app.agents.agents.research  # noqa: F401
import app.agents.agents.email_writer  # noqa: F401
import app.agents.agents.campaign_planner  # noqa: F401
import app.agents.agents.email_sender  # noqa: F401


class ChatRequest(BaseModel):
    workspace_id: str
    messages: list[dict]  # [{"role": "user", "content": "..."}]


async def load_workspace_credentials(db: AsyncSession, workspace_id: str) -> dict[str, dict]:
    """Load and decrypt all LLM credentials for a workspace."""
    result = await db.execute(
        select(ProviderCredential).where(
            ProviderCredential.workspace_id == workspace_id,
            ProviderCredential.provider_type == ProviderType.LLM,
            ProviderCredential.is_active == True,  # noqa: E712
            ProviderCredential.is_valid == True,  # noqa: E712
        )
    )
    creds = {}
    for row in result.scalars().all():
        raw = decrypt_credentials(row.credentials_encrypted, row.nonce)
        creds[row.provider_id] = raw
    return creds


@router.post("/stream")
async def chat_stream(
    body: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """Stream a chat response from the QAi orchestrator via SSE."""
    llm_creds = await load_workspace_credentials(db, body.workspace_id)

    if not llm_creds:
        raise HTTPException(
            400,
            "No LLM provider connected. Go to Settings > Providers to connect one.",
        )

    messages = [ChatMessage(role=m["role"], content=m["content"]) for m in body.messages]
    context = AgentContext(
        workspace_id=body.workspace_id,
        session_id="stream",  # TODO: proper session management
        llm_credentials=llm_creds,
    )

    orchestrator = QAiOrchestrator()

    async def event_generator():
        async for event in orchestrator.run(messages, context):
            yield {
                "event": event.type.value,
                "data": json.dumps({
                    "agent_id": event.agent_id,
                    **event.data,
                }),
            }

    return EventSourceResponse(event_generator())


@router.post("")
async def chat_sync(
    body: ChatRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Non-streaming chat — collects all events and returns the final text."""
    llm_creds = await load_workspace_credentials(db, body.workspace_id)

    if not llm_creds:
        raise HTTPException(
            400,
            "No LLM provider connected. Go to Settings > Providers to connect one.",
        )

    messages = [ChatMessage(role=m["role"], content=m["content"]) for m in body.messages]
    context = AgentContext(
        workspace_id=body.workspace_id,
        session_id="sync",
        llm_credentials=llm_creds,
    )

    orchestrator = QAiOrchestrator()

    text_parts = []
    events = []
    async for event in orchestrator.run(messages, context):
        events.append({"type": event.type.value, "agent_id": event.agent_id, **event.data})
        if event.type.value == "text":
            text_parts.append(event.data.get("text", ""))

    return {
        "response": "\n\n".join(text_parts),
        "events": events,
    }
