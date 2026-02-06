"""Telegram message formatter — converts AgentEvents into Telegram-friendly text."""

import re
from dataclasses import dataclass

from telegram import InlineKeyboardButton, InlineKeyboardMarkup

from app.agents.types import AgentEvent, AgentEventType


TELEGRAM_MAX_LENGTH = 4096

# Characters that must be escaped in Telegram MarkdownV2
_MARKDOWNV2_ESCAPE = re.compile(r"([_*\[\]()~`>#+\-=|{}.!\\])")


@dataclass
class FormattedEvent:
    """Result of formatting an AgentEvent for Telegram."""

    update_status: bool  # True = edit the status message; False = send new message
    status_text: str
    final_text: str | None = None


def format_event(event: AgentEvent) -> FormattedEvent | None:
    """Convert an AgentEvent into a FormattedEvent for Telegram display.

    Returns None for events that should be silently skipped (e.g. DONE).
    """
    match event.type:
        case AgentEventType.THINKING:
            phase = event.data.get("phase", "thinking")
            label = {"planning": "Planning...", "synthesizing": "Synthesizing..."}.get(
                phase, "Thinking..."
            )
            return FormattedEvent(update_status=True, status_text=label)

        case AgentEventType.TOOL_CALL:
            tool = event.data.get("tool", "tool")
            query = event.data.get("query", "")
            if query:
                text = f"Searching for '{query}'..."
            else:
                text = f"Using {tool}..."
            return FormattedEvent(update_status=True, status_text=text)

        case AgentEventType.TOOL_RESULT:
            data = event.data
            count = data.get("count") or data.get("results_count")
            if count is not None:
                text = f"Found {count} results"
            else:
                text = "Processing results..."
            return FormattedEvent(update_status=True, status_text=text)

        case AgentEventType.TEXT:
            raw = event.data.get("text", "")
            return FormattedEvent(
                update_status=False,
                status_text="",
                final_text=raw,
            )

        case AgentEventType.SUB_AGENT:
            agent_name = event.data.get("sub_agent", "agent")
            objective = event.data.get("objective", "")
            short_obj = objective[:60] + "..." if len(objective) > 60 else objective
            return FormattedEvent(
                update_status=True,
                status_text=f"Running {agent_name}: {short_obj}",
            )

        case AgentEventType.ERROR:
            error = event.data.get("error", "Unknown error")
            return FormattedEvent(
                update_status=False,
                status_text="",
                final_text=f"Error: {error}",
            )

        case AgentEventType.DONE:
            return None

    return None


def format_html(text: str) -> str:
    """Convert markdown-ish agent output to Telegram HTML.

    Telegram supports a limited subset of HTML: <b>, <i>, <code>, <pre>, <a>.
    We do a best-effort conversion from the markdown agents typically produce.
    """
    # Bold: **text** or __text__
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"__(.+?)__", r"<b>\1</b>", text)
    # Italic: *text* or _text_ (but not inside <b> tags already)
    text = re.sub(r"(?<!\w)\*(?!\*)(.+?)(?<!\*)\*(?!\w)", r"<i>\1</i>", text)
    # Inline code: `text`
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    # Code blocks: ```...```
    text = re.sub(r"```\w*\n?(.*?)```", r"<pre>\1</pre>", text, flags=re.DOTALL)
    # Links: [text](url)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', text)
    # Headings: ### Title → bold
    text = re.sub(r"^#{1,6}\s+(.+)$", r"<b>\1</b>", text, flags=re.MULTILINE)
    return text


def extract_inline_keyboard(text: str) -> tuple[str, InlineKeyboardMarkup | None]:
    """Detect choice patterns in text and convert to inline keyboard buttons.

    Patterns detected:
    - A) Option text / B) Option text
    - 1. Option text / 2. Option text

    Returns the text with choices removed and the keyboard markup (or None).
    """
    # Pattern: letter followed by ) or .
    letter_pattern = re.compile(r"^([A-D])[).]\s+(.+)$", re.MULTILINE)
    number_pattern = re.compile(r"^(\d)[).]\s+(.+)$", re.MULTILINE)

    matches = letter_pattern.findall(text)
    if len(matches) < 2:
        matches = number_pattern.findall(text)

    if len(matches) < 2:
        return text, None

    buttons = []
    for key, label in matches:
        label = label.strip()
        # Truncate long labels (Telegram callback_data max 64 bytes)
        display = label[:40] + "..." if len(label) > 40 else label
        callback = f"choice:{key}"
        buttons.append([InlineKeyboardButton(display, callback_data=callback)])

    # Remove the choice lines from text
    cleaned = letter_pattern.sub("", text)
    cleaned = number_pattern.sub("", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()

    return cleaned, InlineKeyboardMarkup(buttons)


def truncate_for_telegram(text: str, max_length: int = TELEGRAM_MAX_LENGTH) -> str:
    """Truncate text to fit Telegram's message size limit."""
    if len(text) <= max_length:
        return text
    return text[: max_length - 20] + "\n\n... (truncated)"
