"""Telegram Bot lifecycle — init, start, stop.

Supports two modes:
- Polling (dev): no public URL needed, bot polls Telegram servers
- Webhook (prod): Telegram pushes updates to POST /api/telegram/webhook
"""

import logging

from fastapi import FastAPI, Request, Response
from telegram import Update
from telegram.ext import Application

from app.config import settings
from .handlers import register_handlers

logger = logging.getLogger("qrev.telegram")


class TelegramBot:
    """Manages the Telegram bot Application lifecycle."""

    def __init__(self):
        self._application: Application | None = None

    async def start(self, app: FastAPI) -> None:
        """Build the bot Application and start polling or set up webhook.

        Skips silently if telegram_bot_token is not configured.
        """
        if not settings.telegram_bot_token:
            logger.info("Telegram bot token not set — skipping Telegram integration")
            return

        builder = Application.builder().token(settings.telegram_bot_token)
        self._application = builder.build()

        register_handlers(self._application)

        if settings.telegram_webhook_url:
            await self._start_webhook(app)
        else:
            await self._start_polling()

    async def _start_polling(self) -> None:
        """Start polling mode (for local development)."""
        await self._application.initialize()
        await self._application.start()
        await self._application.updater.start_polling(drop_pending_updates=True)
        logger.info("Telegram bot started (polling mode)")

    async def _start_webhook(self, app: FastAPI) -> None:
        """Set Telegram webhook and mount the POST route on FastAPI."""
        await self._application.initialize()
        await self._application.start()

        webhook_url = settings.telegram_webhook_url.rstrip("/")
        secret = settings.telegram_webhook_secret or None

        await self._application.bot.set_webhook(
            url=webhook_url,
            secret_token=secret,
        )

        # Mount the webhook route on the FastAPI app
        self._register_webhook_route(app)
        logger.info("Telegram bot started (webhook mode: %s)", webhook_url)

    def _register_webhook_route(self, app: FastAPI) -> None:
        """Mount POST /api/telegram/webhook on the FastAPI app."""
        application = self._application
        secret = settings.telegram_webhook_secret or None

        @app.post("/api/telegram/webhook")
        async def telegram_webhook(request: Request) -> Response:
            # Verify the secret token header if configured
            if secret:
                header_secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
                if header_secret != secret:
                    return Response(status_code=403)

            data = await request.json()
            update = Update.de_json(data=data, bot=application.bot)
            await application.process_update(update)
            return Response(status_code=200)

    async def stop(self) -> None:
        """Shut down the bot gracefully."""
        if not self._application:
            return

        try:
            if self._application.updater and self._application.updater.running:
                await self._application.updater.stop()
            await self._application.stop()
            await self._application.shutdown()
            logger.info("Telegram bot stopped")
        except Exception:
            logger.exception("Error stopping Telegram bot")


# Singleton
telegram_bot = TelegramBot()
