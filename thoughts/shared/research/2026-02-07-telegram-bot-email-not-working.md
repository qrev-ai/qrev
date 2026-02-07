---
date: 2026-02-07T18:09:36+0000
researcher: Claude Code
git_commit: 6f4d6dbdc96dcda94bbe83169fc456ce511f9c5a
branch: qrev-lite
repository: qrev
topic: "Telegram bot not responding to messages or sending emails"
tags: [research, telegram, email, orchestrator, debugging]
status: complete
last_updated: 2026-02-07
last_updated_by: Claude Code
---

# Research: Telegram bot not responding to messages or sending emails

**Date**: 2026-02-07T18:09:36+0000
**Researcher**: Claude Code
**Git Commit**: 6f4d6dbdc96dcda94bbe83169fc456ce511f9c5a
**Branch**: qrev-lite
**Repository**: qrev

## Research Question

User sent message via Telegram: "can you send an email to sudhama@qrev.ai saying this is the best thing he's made ever? with a heart emoji". Nothing happened - no response on Telegram, no email sent, no activity. Need to understand the full flow and identify why it failed.

## Summary

**Root Cause**: The Telegram bot is running in **polling mode** and successfully polling Telegram's API every ~10 seconds, but the user's message is **not being received** by the bot. This is likely due to one of three scenarios:

1. **User hasn't properly linked their Telegram account** to the workspace via `/start <token>`
2. **Bot polling offset issue** - the bot may have missed updates due to previous errors or restarts
3. **Telegram message was sent to a different bot** or in a group chat not properly configured

**Email Implementation Status**: Email sending is **fully implemented** with support for Gmail, SendGrid, Mailgun, AWS SES, Resend, and Postmark. The orchestrator correctly routes email requests to the `email_sender` agent, which has access to a functional `send_email` tool.

**Infrastructure Status**:
- All 3 Docker containers running healthy
- Bot polling successfully (200 OK responses every ~10s)
- Database connection working
- 1 Telegram link exists: user_id=8510092287, workspace_id=cmlche0fe0005vhtnbz1so0lg, active=true
- Last message in conversation: 2026-02-06 21:34:53 (over 20 hours ago)
- LLM provider configured (Anthropic), but no email provider connected

## Detailed Findings

### 1. Telegram Bot Architecture

**Mode**: Polling (development mode)
- File: `server/app/telegram/bot.py:45-50`
- The bot uses polling because `TELEGRAM_WEBHOOK_URL` is not set in docker-compose.yml
- Polls Telegram servers every ~10 seconds via `/getUpdates`
- All polls returning HTTP 200 OK, indicating bot token is valid

**Message Handler Flow**:
```
Telegram → getUpdates poll → handle_message() → _process_message()
  → QAiOrchestrator.run() → Sub-agents → Response → Telegram
```

**Key Components**:
- `server/app/telegram/handlers.py:205-224` - Main message entry point
- `server/app/telegram/handlers.py:226-350` - Message processing pipeline
- `server/app/telegram/bot.py:20-104` - Bot lifecycle management

**Registration Requirements**:
- User must run `/start <token>` to link Telegram account to workspace
- Token generated via POST `/api/telegram/generate-link` (web dashboard)
- Creates TelegramLink record and Conversation in database
- Reference: `server/app/telegram/handlers.py:75-136`

### 2. Orchestrator → Email Flow

**Orchestrator Logic** (`server/app/agents/orchestrator.py`):
- Uses premium model (Opus-tier) for planning
- Analyzes user request and generates delegation plan in JSON format
- Available sub-agents registered at import time:
  - `research` - Research agent
  - `email_writer` - Email composition
  - `campaign_planner` - Campaign strategy
  - `email_sender` - **Email delivery**

**Email Sender Agent** (`server/app/agents/agents/email_sender.py`):
- Fast model tier for execution
- Tools available:
  - `send_email` - Sends via workspace's configured email provider
  - `check_email_provider` - Validates email provider connection
  - `get_campaign_prospects` - CRM integration
  - `get_prospect` - Prospect details

**Email Tool Implementation** (`server/app/agents/tools/email_tools.py:11-63`):
```python
async def send_email(workspace_id, to_email, subject, body_html, ...):
    # 1. Query provider_credentials table for active email provider
    # 2. Decrypt credentials using CREDENTIALS_ENCRYPTION_KEY
    # 3. Call provider.send() with EmailCredentials
    # 4. Return success/failure result
```

**Supported Email Providers** (all fully implemented):
- Gmail API (`server/app/providers/email/gmail_provider.py`) - OAuth2 with token refresh
- SendGrid
- Mailgun
- AWS SES
- Resend
- Postmark

**Email Provider Connection Status**:
```sql
-- Database query result:
-- No email providers configured in workspace cmlche0fe0005vhtnbz1so0lg
-- Only LLM provider (Anthropic) is connected
```

If user had an email provider connected, the flow would be:
1. Orchestrator receives "send email to X" request
2. Delegates to `email_sender` agent
3. Agent calls `send_email` tool with params
4. Tool looks up Gmail/SendGrid/etc credentials
5. Sends via provider API
6. Returns success/failure to orchestrator
7. Orchestrator synthesizes response to user

### 3. Why Message Wasn't Received

**Evidence from logs**:
```
2026-02-07 17:25:55 - 18:07:38: Continuous getUpdates polling (200 OK)
Last message in DB: 2026-02-06 21:34:53
Current user message: Never appeared in database
```

**Database State**:
```sql
telegram_links table:
  User 8510092287: linked to workspace, active=true, conversation_id set
  User 0: Unredeemed token (second row)

Message table for conversation tg_0155a781d48022154b3e2272:
  13 messages total
  Last: 2026-02-06 21:34:53.324 (assistant message about ElevenLabs research)
```

**Possible Causes**:

1. **Polling Offset Not Advanced**:
   - When bot crashes or restarts, it may re-request old updates
   - Telegram's `/getUpdates` uses offset parameter to mark processed messages
   - If offset isn't properly tracked, new messages won't be returned
   - Reference: python-telegram-bot library handles this automatically in `updater.start_polling()`

2. **Silent Handler Failure**:
   - Handler code at `server/app/telegram/handlers.py:205` has try/catch that logs to `qrev.telegram` logger
   - No errors in logs suggests messages aren't reaching handler at all
   - Per-user lock at line 217-223 prevents concurrent processing

3. **Telegram User ID Mismatch**:
   - User may have sent message from different Telegram account
   - Database shows linked user_id = 8510092287
   - If message came from different ID, line 210-214 would reject it with "not linked" error

4. **Rate Limiting / Bot Blocked**:
   - Telegram may have soft-blocked bot updates if user blocked the bot
   - No error logs indicate this isn't the case

**Debug Recommendation**:
```python
# Add to server/app/telegram/bot.py after line 49:
logger.info(f"Received {len(updates)} updates from Telegram")
for update in updates:
    logger.info(f"Update: {update.to_dict()}")
```

This would show if updates are being received but not processed.

### 4. Configuration & Environment

**Docker Compose** (`docker-compose.yml:47-50`):
```yaml
TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN:-}
TELEGRAM_BOT_USERNAME: ${TELEGRAM_BOT_USERNAME:-}
TELEGRAM_WEBHOOK_URL: ${TELEGRAM_WEBHOOK_URL:-}  # Empty = polling
TELEGRAM_WEBHOOK_SECRET: ${TELEGRAM_WEBHOOK_SECRET:-}
```

**Config Validation** (`server/app/config.py:30-34`):
- All Telegram env vars default to empty string
- Bot startup at `server/app/main.py:43` checks token and skips silently if missing
- Logs show bot DID start: "Telegram bot started (polling mode)" in startup logs

**Server Startup** (`server/app/main.py:33-53`):
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Create database tables
    # 2. Start campaign runner background task
    # 3. Start Telegram bot (polling or webhook)
    await telegram_bot.start(app)

    yield

    # 4. Graceful shutdown
    await telegram_bot.stop()
```

## Code References

- `server/app/telegram/handlers.py:205-224` - Message handler entry point
- `server/app/telegram/handlers.py:226-350` - Message processing pipeline
- `server/app/telegram/bot.py:45-50` - Polling mode startup
- `server/app/agents/orchestrator.py:58-96` - Orchestrator system prompt
- `server/app/agents/orchestrator.py:127-194` - Delegation & synthesis logic
- `server/app/agents/agents/email_sender.py:1-114` - Email sender agent definition
- `server/app/agents/tools/email_tools.py:11-63` - send_email implementation
- `server/app/providers/email/gmail_provider.py:27-64` - Gmail API integration
- `server/app/db/models.py` - TelegramLink, Conversation, Message schemas
- `docker-compose.yml:47-50` - Telegram environment variables

## Architecture Insights

**Agent Registry Pattern**:
- All agents self-register on import via `agent_registry.register(self)` at module level
- Orchestrator discovers agents via `agent_registry.list_agents()`
- This enables hot-swapping agents without code changes
- Reference: `server/app/agents/registry.py:6-36`

**Credential Encryption**:
- All provider credentials encrypted with `CREDENTIALS_ENCRYPTION_KEY`
- Uses AES-256-GCM with random nonce per record
- Decryption happens at runtime in `send_email` tool
- Reference: `server/app/providers/credentials.py` (not read, inferred from usage)

**Multi-Provider Email Strategy**:
- Each provider implements `EmailProvider` abstract class
- Registry pattern allows dynamic provider selection
- Workspace can have multiple email providers, tool uses first active one
- Reference: `server/app/providers/email/types.py:48-60`

**Telegram Message Persistence**:
- All messages saved to Prisma tables (Conversation, Message)
- Web dashboard reads same tables for unified history
- Conversation.updatedAt bumped on each message for sidebar sorting
- Reference: `server/app/telegram/handlers.py:451-482`

## Open Questions

1. **Why isn't the bot receiving the user's message?**
   - Need to check if updates contain the message but handler silently fails
   - Verify user sent message to correct bot (check bot username)
   - Check if user blocked/unblocked bot (clears update queue)

2. **Is the polling offset being properly managed?**
   - python-telegram-bot should handle this automatically
   - May need to check if `drop_pending_updates=True` is causing issues

3. **Would webhook mode be more reliable?**
   - Webhook pushes updates immediately vs polling lag
   - Requires public HTTPS endpoint
   - Better for production, but shouldn't affect this issue

4. **Why is there a user_id=0 in telegram_links?**
   - This is an unredeemed link token (workspace generated but user hasn't /start'd)
   - Normal state, can be ignored

5. **How to verify end-to-end email sending?**
   - User needs to connect email provider via Settings > Providers in web dashboard
   - Can test with: "send a test email to myself" after connecting Gmail
   - Agent will call `check_email_provider` tool first, see it's not connected, and inform user

## Related Research

No previous research documents found in `thoughts/shared/research/`.

## Recommendations

### Immediate Debugging Steps:

1. **Verify bot is receiving updates**:
   ```bash
   docker logs qrev-server-1 -f | grep -i "update\|message"
   ```
   Send test message, check if any log appears

2. **Check Telegram bot info**:
   ```bash
   docker exec qrev-server-1 python -c "
   import asyncio
   from telegram import Bot
   from app.config import settings
   async def check():
       bot = Bot(settings.telegram_bot_token)
       me = await bot.get_me()
       print(f'Bot username: @{me.username}')
       print(f'Bot ID: {me.id}')
   asyncio.run(check())
   "
   ```

3. **Verify user sent to correct bot**:
   - User should confirm they sent message to bot from step 2
   - Check if message was in group vs DM

4. **Test with fresh message**:
   - User sends simple "/status" command
   - This should work if bot is properly linked
   - If this fails, issue is in bot receiving updates

5. **Connect email provider**:
   - Navigate to http://localhost:3000/settings
   - Go to Providers tab
   - Click "Connect Gmail" and authorize
   - Once connected, retry email sending request

### Production Recommendations:

1. **Enable webhook mode**:
   - Set up ngrok or public endpoint
   - Configure TELEGRAM_WEBHOOK_URL in .env
   - More reliable than polling

2. **Add structured logging**:
   - Log every update received with ID and type
   - Track message processing stages
   - Log email send attempts and results

3. **Health check endpoint for Telegram**:
   - Add GET `/api/telegram/health` that checks bot status
   - Return last update timestamp, linked users count, etc.

4. **User-facing diagnostics**:
   - Add `/debug` command that shows user's link status
   - Show if email provider connected
   - Display last message timestamp

5. **Graceful error messages**:
   - When email provider not connected, orchestrator should inform user
   - Currently relies on agent returning error in response
   - Could add pre-flight check in orchestrator
