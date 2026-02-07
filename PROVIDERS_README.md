# Provider Setup Guide

This guide covers how to configure external service providers for QRev.

## Gmail (Email Sending)

QRev can send emails through your Gmail account using Google's Gmail API. When you log in with Google OAuth, QRev automatically requests Gmail permissions and stores the tokens for the backend to use.

### Prerequisites

You must enable the **Gmail API** in your Google Cloud project. Without this, email sending will fail with a `403 SERVICE_DISABLED` error.

### Step 1: Enable the Gmail API

1. Go to the [Google Cloud Console](https://console.cloud.google.com)
2. Select the same project you used for Google OAuth (the one with your `GOOGLE_CLIENT_ID`)
3. Go to **APIs & Services > Library** (or search "Gmail API" in the top bar)
4. Find **Gmail API** and click **Enable**

That's it. The Gmail API is now active for your project.

### Step 2: Verify OAuth Scopes

QRev requests these Gmail scopes during Google sign-in:

| Scope | Purpose |
|-------|---------|
| `https://www.googleapis.com/auth/gmail.send` | Send emails on behalf of the user |
| `https://www.googleapis.com/auth/gmail.readonly` | Read email metadata (for future features) |

These are configured in `lib/auth.ts` and requested automatically during login. No manual scope configuration is needed.

### Step 3: Add Test Users (if app is in "Testing" status)

If your Google Cloud OAuth consent screen is still in **Testing** mode (not published):

1. Go to **APIs & Services > OAuth consent screen**
2. Under **Test users**, add the Gmail addresses of anyone who needs to send emails
3. Only test users can grant Gmail permissions while the app is in testing mode

### Step 4: Re-login to Grant Permissions

If you logged in before Gmail scopes were configured, you need to re-login:

1. Log out of QRev
2. Log back in with Google
3. Google will show a consent screen asking for Gmail permissions
4. Accept the permissions

QRev will automatically sync your Gmail tokens to the backend on login.

### How It Works

1. **Login**: User signs in with Google OAuth. NextAuth stores tokens in the `Account` table.
2. **Token sync**: The `signIn` event in `lib/auth.ts` sends tokens to the FastAPI backend (`POST /api/providers/sync-gmail`), which stores them encrypted in `provider_credentials`.
3. **Sending**: When an agent needs to send email, `email_tools.py` reads the credentials, refreshes the token if expired, and calls the Gmail API.
4. **Token lifecycle**: Tokens are checked for freshness (>60s before expiry). If stale, the refresh token is used to get a new access token, which is persisted back to the database.

### Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `403 SERVICE_DISABLED` | Gmail API not enabled | Enable Gmail API in Google Cloud Console (Step 1) |
| `No access token. Re-authorize Gmail.` | Tokens not synced or expired | Log out and log back in |
| `No email provider connected` | Gmail tokens missing from database | Log out, log back in, check that Google consent screen shows Gmail scopes |
| `Token refresh failed` | Refresh token revoked or `GOOGLE_CLIENT_ID`/`SECRET` not set in server | Check `docker-compose.yml` has both env vars in the `server` service |
| `Missing gmail.send scope` | User logged in before scopes were added | Log out, log back in to re-consent |

### Environment Variables

Both the `web` and `server` services need these in `docker-compose.yml`:

```yaml
GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:-}
GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET:-}
```

The server uses these for token refresh. If they're missing, token refresh will silently fail.

---

## Anthropic (LLM)

See the main [README.md](README.md#connect-anthropic) for Anthropic setup.

## Telegram

See the main [README.md](README.md#connect-telegram) for Telegram bot setup.
