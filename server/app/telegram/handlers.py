"""Telegram command and message handlers — the core gateway translation layer.

Translates Telegram messages into QAi agent calls and formats agent events
back as Telegram messages. All conversation data is written to the same Prisma
tables so the web dashboard stays in sync.
"""

import asyncio
import logging
import time
import secrets
from datetime import datetime

from sqlalchemy import select, text
from telegram import Update
from telegram.constants import ChatAction, ParseMode
from telegram.ext import (
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    ContextTypes,
    filters,
)

from app.db.session import async_session
from app.db.models import TelegramLink
from app.api.chat import load_workspace_credentials
from app.agents.orchestrator import QAiOrchestrator
from app.agents.types import AgentContext, AgentEventType
from app.providers.llm.types import ChatMessage

# Import agents so they register themselves
import app.agents.agents.research  # noqa: F401
import app.agents.agents.email_writer  # noqa: F401
import app.agents.agents.campaign_planner  # noqa: F401
import app.agents.agents.email_sender  # noqa: F401

from .formatter import (
    format_event,
    format_html,
    extract_inline_keyboard,
    truncate_for_telegram,
)

logger = logging.getLogger("qrev.telegram")

# Per-user processing locks to prevent concurrent message handling
_user_locks: dict[int, asyncio.Lock] = {}

# Status message edit throttle: max 1 edit per this many seconds
STATUS_THROTTLE_SECONDS = 2.0


def _get_user_lock(user_id: int) -> asyncio.Lock:
    if user_id not in _user_locks:
        _user_locks[user_id] = asyncio.Lock()
    return _user_locks[user_id]


def register_handlers(application) -> None:
    """Register all Telegram handlers on the Application."""
    application.add_handler(CommandHandler("start", handle_start))
    application.add_handler(CommandHandler("help", handle_help))
    application.add_handler(CommandHandler("status", handle_status))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    application.add_handler(CallbackQueryHandler(handle_callback))


# ============================================
# Command Handlers
# ============================================


async def handle_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /start <token> — redeem link token to bind Telegram user to workspace."""
    args = context.args
    if not args:
        await update.message.reply_text(
            "Welcome to QRev!\n\n"
            "To get started, generate a link token from the QRev web dashboard "
            "(Settings > Telegram) and use:\n\n"
            "/start <your-token>"
        )
        return

    token = args[0]
    telegram_user = update.effective_user
    telegram_user_id = telegram_user.id
    telegram_username = telegram_user.username

    async with async_session() as db:
        # Find the link token
        result = await db.execute(
            select(TelegramLink).where(
                TelegramLink.link_token == token,
                TelegramLink.is_active == True,  # noqa: E712
            )
        )
        link = result.scalar_one_or_none()

        if not link:
            await update.message.reply_text(
                "Invalid or expired link token. Please generate a new one from the dashboard."
            )
            return

        # Check if this Telegram user is already linked to another workspace
        existing = await db.execute(
            select(TelegramLink).where(
                TelegramLink.telegram_user_id == telegram_user_id,
                TelegramLink.is_active == True,  # noqa: E712
            )
        )
        existing_link = existing.scalar_one_or_none()
        if existing_link and existing_link.id != link.id:
            # Deactivate old link
            existing_link.is_active = False

        # Bind the Telegram user
        link.telegram_user_id = telegram_user_id
        link.telegram_username = telegram_username
        link.link_token = None  # Consume the one-time token

        # Create a conversation in Prisma tables for this link
        conv_id = await _create_conversation(db, link.workspace_id, telegram_user_id)
        link.conversation_id = conv_id

        await db.commit()

    await update.message.reply_text(
        "Connected! You can now chat with QAi directly here.\n\n"
        "Try: \"Research Anthropic\" or \"Write an outreach email to...\"\n\n"
        "Type /help to see all commands."
    )


async def handle_help(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """List commands and example prompts."""
    await update.message.reply_text(
        "<b>QRev Bot Commands</b>\n\n"
        "/help — Show this message\n"
        "/status — Show workspace info\n\n"
        "<b>Example prompts:</b>\n"
        "• Research Anthropic\n"
        "• Write a cold outreach email to the VP of Engineering at Stripe\n"
        "• Plan a 3-step email campaign for AI startups\n"
        "• What campaigns are running?\n",
        parse_mode=ParseMode.HTML,
    )


async def handle_status(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show workspace info — connected providers, active campaigns."""
    link = await _get_link(update.effective_user.id)
    if not link:
        await update.message.reply_text("You're not linked to a workspace. Use /start <token>.")
        return

    async with async_session() as db:
        # Count connected providers
        prov_result = await db.execute(
            text("""
                SELECT provider_type, COUNT(*) as cnt
                FROM provider_credentials
                WHERE workspace_id = :wid AND is_active = true AND is_valid = true
                GROUP BY provider_type
            """),
            {"wid": link.workspace_id},
        )
        providers = {row["provider_type"]: row["cnt"] for row in prov_result.mappings().all()}

        # Count active campaigns (Prisma table, may not exist yet)
        campaign_count = 0
        try:
            camp_result = await db.execute(
                text("""
                    SELECT COUNT(*) as cnt FROM "Campaign"
                    WHERE "workspaceId" = :wid AND status = 'ACTIVE'
                """),
                {"wid": link.workspace_id},
            )
            campaign_count = camp_result.scalar() or 0
        except Exception:
            pass  # Table may not exist yet

    llm_count = providers.get("llm", 0)
    email_count = providers.get("email", 0)

    await update.message.reply_text(
        f"<b>Workspace Status</b>\n\n"
        f"Workspace: <code>{link.workspace_id}</code>\n"
        f"LLM providers: {llm_count}\n"
        f"Email providers: {email_count}\n"
        f"Active campaigns: {campaign_count}",
        parse_mode=ParseMode.HTML,
    )


# ============================================
# Message Handler (main agent loop)
# ============================================


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Main message handler — runs user text through QAi orchestrator."""
    user_text = update.message.text
    telegram_user_id = update.effective_user.id

    link = await _get_link(telegram_user_id)
    if not link:
        await update.message.reply_text(
            "You're not linked to a workspace yet. Use /start <token> to connect."
        )
        return

    lock = _get_user_lock(telegram_user_id)
    if lock.locked():
        await update.message.reply_text("Still working on your previous request, please wait...")
        return

    async with lock:
        await _process_message(update, link, user_text)


async def _process_message(update: Update, link: TelegramLink, user_text: str) -> None:
    """Process a user message through the agent pipeline."""
    chat_id = update.effective_chat.id

    # Send typing indicator
    await update.effective_chat.send_action(ChatAction.TYPING)

    # Send initial status message that we'll edit in-place
    # Use effective_message (works for both direct messages and callback queries)
    msg_target = update.effective_message
    status_msg = await msg_target.reply_text("Thinking...")

    async with async_session() as db:
        # Save user message to Prisma Conversation/Message tables
        await _save_message(db, link.conversation_id, "user", user_text)

        # Load recent history
        history = await _load_messages(db, link.conversation_id, limit=20)

        # Load LLM credentials
        llm_creds = await load_workspace_credentials(db, link.workspace_id)

    if not llm_creds:
        await _safe_edit(
            status_msg,
            "No LLM provider connected. Go to Settings > Providers in the web dashboard.",
        )
        return

    messages = [ChatMessage(role=m["role"], content=m["content"]) for m in history]

    # Collect sub-agent events via emit callback for progress updates
    sub_events: list[AgentEvent] = []

    async def _on_emit(event: AgentEvent):
        sub_events.append(event)

    agent_context = AgentContext(
        workspace_id=link.workspace_id,
        session_id=f"tg-{link.telegram_user_id}",
        llm_credentials=llm_creds,
        emit=_on_emit,
    )

    orchestrator = QAiOrchestrator()
    final_text_parts: list[str] = []
    last_edit_time = 0.0

    try:
        async for event in orchestrator.run(messages, agent_context):
            # Also drain any sub-agent events collected via emit
            while sub_events:
                sub_evt = sub_events.pop(0)
                sub_formatted = format_event(sub_evt)
                if sub_formatted and sub_formatted.update_status:
                    now = time.monotonic()
                    if now - last_edit_time >= STATUS_THROTTLE_SECONDS:
                        await _safe_edit(status_msg, sub_formatted.status_text)
                        last_edit_time = now

            formatted = format_event(event)
            if formatted is None:
                continue

            if formatted.update_status:
                # Throttle status edits
                now = time.monotonic()
                if now - last_edit_time >= STATUS_THROTTLE_SECONDS:
                    await _safe_edit(status_msg, formatted.status_text)
                    last_edit_time = now

            if formatted.final_text:
                final_text_parts.append(formatted.final_text)

    except Exception:
        logger.exception("Error running agent for Telegram user %s", link.telegram_user_id)
        await _safe_edit(status_msg, "Something went wrong. Please try again.")
        return

    if not final_text_parts:
        await _safe_edit(status_msg, "No response generated. Try rephrasing your request.")
        return

    # Format and send final response
    combined = "\n\n".join(final_text_parts)
    html_text = format_html(combined)
    html_text = truncate_for_telegram(html_text)

    # Check for inline keyboard choices
    cleaned_text, keyboard = extract_inline_keyboard(html_text)

    try:
        await status_msg.edit_text(
            cleaned_text,
            parse_mode=ParseMode.HTML,
            reply_markup=keyboard,
        )
    except Exception:
        # Fall back to plain text if HTML parsing fails
        plain = truncate_for_telegram(combined)
        await _safe_edit(status_msg, plain, keyboard=keyboard)

    # Save assistant response
    async with async_session() as db:
        await _save_message(db, link.conversation_id, "assistant", combined)


# ============================================
# Callback Query Handler (inline keyboard)
# ============================================


async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle inline keyboard button presses."""
    query = update.callback_query
    await query.answer()  # Remove loading spinner

    data = query.data or ""
    if not data.startswith("choice:"):
        return

    choice_key = data.split(":", 1)[1]
    telegram_user_id = update.effective_user.id

    # Edit original message to show the selection
    try:
        original_text = query.message.text or ""
        await query.edit_message_text(f"{original_text}\n\nSelected: {choice_key}")
    except Exception:
        pass

    link = await _get_link(telegram_user_id)
    if not link:
        return

    # Feed the selection back through the agent as a new user message
    selection_text = f"I choose option {choice_key}"
    lock = _get_user_lock(telegram_user_id)
    async with lock:
        await _process_message(update, link, selection_text)


# ============================================
# Helper Functions
# ============================================


async def _get_link(telegram_user_id: int) -> TelegramLink | None:
    """Look up an active TelegramLink by Telegram user ID."""
    async with async_session() as db:
        result = await db.execute(
            select(TelegramLink).where(
                TelegramLink.telegram_user_id == telegram_user_id,
                TelegramLink.is_active == True,  # noqa: E712
            )
        )
        return result.scalar_one_or_none()


async def _create_conversation(db, workspace_id: str, telegram_user_id: int) -> str:
    """Create a Conversation row in the Prisma table. Returns the conversation ID."""
    conv_id = f"tg_{secrets.token_hex(12)}"
    now = datetime.utcnow()
    try:
        await db.execute(
            text("""
                INSERT INTO "Conversation" (id, "workspaceId", title, "createdAt", "updatedAt")
                VALUES (:id, :wid, :title, :now, :now)
            """),
            {
                "id": conv_id,
                "wid": workspace_id,
                "title": f"Telegram ({telegram_user_id})",
                "now": now,
            },
        )
        await db.commit()
    except Exception:
        logger.debug("Could not create Conversation row (table may not exist yet)")
        await db.rollback()
    return conv_id


async def _load_messages(db, conversation_id: str | None, limit: int = 20) -> list[dict]:
    """Load recent messages from the Prisma Message table."""
    if not conversation_id:
        return []

    try:
        result = await db.execute(
            text("""
                SELECT role, content FROM "Message"
                WHERE "conversationId" = :cid
                ORDER BY "createdAt" DESC
                LIMIT :lim
            """),
            {"cid": conversation_id, "lim": limit},
        )
        rows = result.mappings().all()
        # Reverse so oldest first
        return [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]
    except Exception:
        logger.debug("Could not load messages (table may not exist yet)")
        return []


async def _save_message(db, conversation_id: str | None, role: str, content: str) -> None:
    """Save a message to the Prisma Message table."""
    if not conversation_id:
        return

    msg_id = f"msg_{secrets.token_hex(12)}"
    now = datetime.utcnow()
    try:
        await db.execute(
            text("""
                INSERT INTO "Message" (id, "conversationId", role, content, "createdAt")
                VALUES (:id, :cid, :role, :content, :now)
            """),
            {
                "id": msg_id,
                "cid": conversation_id,
                "role": role,
                "content": content,
                "now": now,
            },
        )
        # Also bump the conversation's updatedAt so it sorts to top in sidebar
        await db.execute(
            text("""
                UPDATE "Conversation" SET "updatedAt" = :now WHERE id = :cid
            """),
            {"now": now, "cid": conversation_id},
        )
        await db.commit()
    except Exception:
        logger.debug("Could not save message (table may not exist yet)")
        await db.rollback()


async def _safe_edit(message, text: str, keyboard=None) -> None:
    """Edit a message, ignoring 'message is not modified' errors."""
    try:
        await message.edit_text(text, reply_markup=keyboard)
    except Exception as e:
        if "message is not modified" not in str(e).lower():
            logger.debug("Failed to edit message: %s", e)
