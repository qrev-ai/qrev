"""Telegram admin API — link generation and management."""

import secrets

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import get_db
from app.db.models import TelegramLink

router = APIRouter(prefix="/telegram", tags=["telegram"])


class GenerateLinkRequest(BaseModel):
    workspace_id: str


class GenerateLinkResponse(BaseModel):
    link_token: str
    bot_url: str


class TelegramLinkOut(BaseModel):
    id: str
    telegram_user_id: int | None
    telegram_username: str | None
    workspace_id: str
    conversation_id: str | None
    is_active: bool


@router.post("/generate-link", response_model=GenerateLinkResponse)
async def generate_link(
    body: GenerateLinkRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate a one-time link token for binding a Telegram user to a workspace."""
    token = secrets.token_urlsafe(48)
    link_id = f"tgl_{secrets.token_hex(12)}"

    link = TelegramLink(
        id=link_id,
        telegram_user_id=0,  # Will be set when user redeems the token
        workspace_id=body.workspace_id,
        link_token=token,
    )
    db.add(link)
    await db.commit()

    bot_username = settings.telegram_bot_username
    if bot_username:
        bot_url = f"https://t.me/{bot_username}?start={token}"
    else:
        bot_url = f"(set TELEGRAM_BOT_USERNAME) /start {token}"

    return GenerateLinkResponse(link_token=token, bot_url=bot_url)


@router.get("/links/{workspace_id}", response_model=list[TelegramLinkOut])
async def list_links(
    workspace_id: str,
    db: AsyncSession = Depends(get_db),
):
    """List active Telegram links for a workspace."""
    result = await db.execute(
        select(TelegramLink).where(
            TelegramLink.workspace_id == workspace_id,
            TelegramLink.is_active == True,  # noqa: E712
        )
    )
    links = result.scalars().all()
    return [
        TelegramLinkOut(
            id=link.id,
            telegram_user_id=link.telegram_user_id if link.telegram_user_id != 0 else None,
            telegram_username=link.telegram_username,
            workspace_id=link.workspace_id,
            conversation_id=link.conversation_id,
            is_active=link.is_active,
        )
        for link in links
    ]


@router.delete("/links/{link_id}")
async def revoke_link(
    link_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Revoke (deactivate) a Telegram link."""
    result = await db.execute(
        select(TelegramLink).where(TelegramLink.id == link_id)
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    link.is_active = False
    await db.commit()
    return {"status": "revoked", "id": link_id}
