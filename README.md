<h1 align="center"> Welcome to QRev AI 2.0</h1>

<p align="center">
  <em>AI Agents to scale your Sales org infinitely; Open Source alternative to Salesforce</em>
</p>

<h3 align="center">
	<a href="https://qrev.ai?utm_medium=community&utm_source=github&utm_campaign=qrev%20repo">Website</a>
	<span> | </span>
	<a href="https://join.slack.com/t/qrev/shared_invite/zt-2gsc6omvb-L5bLaBubluDEdK5ZB133dg">Community Slack</a>
</h3>

<div style="text-align: center;">
  <img
    width="1028"
	style="display: block; margin-left: auto; margin-right: auto;"
    class="block dark:hidden"
    src="/images/Qai-Structure.png"
    alt="Architecture"
  />
</div>

<p align="center">
    <img alt="Node version" src="https://img.shields.io/static/v1?label=node&message=%20%3E=18%2E18&logo=node.js&color=2334D058" />
      <img src="https://img.shields.io/badge/lang-English-blue.svg" alt="English">
</p>

If Salesforce were built today, starting with AI, it would be built with AI Agents at the foundation.

But Salesforce is too expensive, and hard to customise.

> NOTE: QRev is under active development, and we are releasing an early version so that a strong Agentic foundation can be set with ideas from contributors like you. This repository will be updated regularly with changes and new releases.

## Digital Workers for each Sales Role or Superagent (a.k.a Qai )?

Sales orgs have people like SDR's, BDR's, Account Execs, Head of Sales etc.

The question we ask ourselves constantly is whether we should mimic the real world and have Digital Worker equivalents
within the app ? or Have one superagent that co-ordinates with other software agents internally.

We are starting with the latter approach. We think based on the users role and role based permissions, Qai will be able
to do different things. It will also simplify the requirement of remembering names of Digital workers like Qai
just for the sake of seeming cool. But internally, there will be an army of digital workers / agents doing their job anyways.

QRev 2.0 follows Anthropic's [orchestrator-worker pattern](https://www.anthropic.com/engineering/multi-agent-research-system): a premium lead model (QAi) plans and delegates to specialized sub-agents that run in parallel on balanced/fast models. Their research shows this outperforms a single premium model by 90%.

Open to ideas.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), React, Tailwind CSS, Zustand |
| Backend | Python FastAPI (async), SSE streaming |
| Database | PostgreSQL (shared) — Prisma ORM (frontend) + SQLAlchemy (backend) |
| Auth | Auth.js v5 (Google OAuth, JWT sessions) |
| AI | Multi-provider: Anthropic, OpenAI, Google, Groq — users connect their own keys |
| Agents | Orchestrator-worker: QAi lead + Research, Email Writer, Campaign Planner, Email Sender |
| Encryption | AES-256-GCM for all stored credentials |
| Telegram | python-telegram-bot v21+ (polling / webhook) |
| Deployment | Docker Compose (3 containers: db, server, web) |

## Quick Start

Everything runs with Docker. Three containers: PostgreSQL, FastAPI backend, Next.js frontend.

### Prerequisites

- Docker & Docker Compose
- An Anthropic API key (or OpenAI, Google, Groq)
- Google OAuth credentials (for web login)

### 1. Clone and configure

```bash
git clone https://github.com/qrev-ai/qrev.git
cd qrev

cp .env.example .env
```

Edit `.env` and fill in:

```bash
# Required: encryption key for stored credentials
# Generate with: openssl rand -base64 32
CREDENTIALS_ENCRYPTION_KEY=your-generated-key

# Required: Google OAuth (for web login)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Optional: Telegram bot (see Telegram section below)
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
```

### 2. Start everything

```bash
docker-compose up --build
```

This starts:
- **PostgreSQL** on port 5432
- **FastAPI backend** on port 8000
- **Next.js frontend** on port 3000

### 3. Log in and create a workspace

1. Open http://localhost:3000
2. Sign in with Google
3. Create your workspace (e.g. "My Company")

### 4. Connect an LLM provider

1. Go to **Settings > Providers**
2. Click **Connect** next to Anthropic (or OpenAI, etc.)
3. Paste your API key
4. You're ready to chat with QAi

> **Get an Anthropic API key**: Go to https://console.anthropic.com > API Keys > Create Key

## Set Up Google OAuth (for Login)

QRev uses Google OAuth for user authentication. Here's how to set it up:

### 1. Go to Google Cloud Console

- Open https://console.cloud.google.com
- Create a new project (e.g. "QRev") or select an existing one

### 2. Configure the OAuth Consent Screen

- Go to **APIs & Services > OAuth consent screen** (or search "OAuth consent screen" in the top bar)
- Choose **External** user type (unless you have a Google Workspace org)
- Fill in:
  - **App name**: QRev (or anything you like)
  - **User support email**: your email
  - **Developer contact email**: your email
- Click **Save and Continue** through the remaining steps (Scopes, Test Users)
- On the **Test Users** step, add your own Gmail address (required while the app is in "Testing" status)

### 3. Create OAuth Credentials

- Go to **APIs & Services > Credentials**
- Click **Create Credentials > OAuth client ID**
- Application type: **Web application**
- Name: `QRev Local` (or anything)
- **Authorized JavaScript origins**: add `http://localhost:3000`
- **Authorized redirect URIs**: add `http://localhost:3000/api/auth/callback/google`
- Click **Create**

### 4. Copy the credentials

Google will show your **Client ID** and **Client Secret**. Add them to your `.env`:

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret
```

Restart the app and you're ready to log in at http://localhost:3000/login.

## Connect Anthropic

1. Go to https://console.anthropic.com
2. Navigate to **API Keys** and create a new key
3. Copy the key (starts with `sk-ant-api03-...`)
4. In QRev, go to **Settings > Providers > Anthropic > Connect**
5. Paste your API key and save

QRev uses a multi-tier model router:
- **Premium tier** (Claude Opus) — QAi orchestrator for planning and synthesis
- **Balanced tier** (Claude Sonnet) — Sub-agents for research, email writing
- **Fast tier** (Claude Haiku) — Quick tasks, validation

The router automatically picks the cheapest model per tier from your connected providers.

## Connect Telegram

Chat with QAi agents directly from Telegram — research companies, write emails, deploy campaigns. Conversations sync to the web dashboard in real-time.

### Setup

1. **Create a bot**: Message [@BotFather](https://t.me/BotFather) on Telegram, send `/newbot`, follow the prompts
2. **Add to `.env`**:
   ```bash
   TELEGRAM_BOT_TOKEN=123456:ABC-DEF...    # from BotFather
   TELEGRAM_BOT_USERNAME=your_bot_name      # without the @
   ```
3. **Restart**: `docker-compose up --build`
4. **Link your account**: In QRev web, go to **Settings > Integrations > Telegram > Generate Link**
5. **Open the link** in Telegram and send `/start` — you're connected

### What you can do

- "Research Anthropic" — runs the research agent, returns company intel
- "Write a cold email to the VP of Engineering at Stripe" — drafts outreach
- "Plan a 3-step campaign for AI startups" — creates a campaign plan
- Click inline buttons to make choices, results flow back through the agent

### Production (Webhook Mode)

For production, set a webhook URL instead of polling:

```bash
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook
TELEGRAM_WEBHOOK_SECRET=some-random-secret
```

## Architecture

```
                    Telegram API
                        |
                        v
        +----------------------------------+
        |     FastAPI Backend (Python)     |
        |                                  |
        |  /api/telegram/webhook           |
        |  /api/chat (SSE streaming)       |
        |  /api/providers/*                |
        |                                  |
        |  +----------------------------+  |
        |  |   QAi Orchestrator         |  |
        |  |   (Premium model: plans)   |  |
        |  +----------------------------+  |
        |       |          |          |    |
        |       v          v          v    |
        |  Research   Email Writer  Campaign|
        |  Agent      Agent        Planner |
        |  (Balanced) (Balanced)   (Balanced)|
        +----------------------------------+
                        |
                        v
        +----------------------------------+
        |   PostgreSQL (shared database)   |
        |   - Prisma tables (frontend)     |
        |   - SQLAlchemy tables (backend)  |
        +----------------------------------+
                        ^
                        |
        +----------------------------------+
        |   Next.js Frontend (React)       |
        |   - Dashboard                    |
        |   - QAi Chat (SSE)              |
        |   - Campaign Management          |
        |   - Settings & Providers         |
        +----------------------------------+
```

## Project Structure

```
qrev/
├── app/                        # Next.js App Router (pages + API routes)
│   ├── (app)/                  # Authenticated app shell
│   │   ├── page.tsx            # Dashboard
│   │   ├── chat/               # QAi chat interface
│   │   ├── campaigns/          # Campaign management
│   │   └── settings/           # Workspace settings
│   └── api/                    # Next.js API routes
│       ├── auth/               # Auth.js endpoints
│       ├── workspaces/         # Workspace CRUD
│       ├── campaigns/          # Campaign API
│       └── conversations/      # Chat history
├── components/
│   ├── ui/                     # Base components (Card, Button, Input, etc.)
│   ├── chat/                   # Chat interface components
│   ├── campaign/               # Campaign components
│   └── settings/               # Settings panels
├── lib/
│   ├── auth.ts                 # Auth.js config (Google OAuth, JWT)
│   ├── db.ts                   # Prisma client
│   └── api-client.ts           # Python backend API client
├── server/                     # Python FastAPI backend
│   ├── app/
│   │   ├── agents/             # Agent system
│   │   │   ├── orchestrator.py # QAi lead orchestrator
│   │   │   ├── engine.py       # Model router + execution
│   │   │   ├── registry.py     # Agent auto-registration
│   │   │   └── agents/         # Sub-agents (research, email, campaign)
│   │   ├── providers/          # Multi-provider adapters
│   │   │   ├── llm/            # Anthropic, OpenAI, Google, Groq
│   │   │   └── email/          # SendGrid, Resend, SMTP
│   │   ├── telegram/           # Telegram bot gateway
│   │   │   ├── bot.py          # Bot lifecycle (polling/webhook)
│   │   │   ├── handlers.py     # Command & message handlers
│   │   │   └── formatter.py    # AgentEvent -> Telegram formatting
│   │   └── db/                 # SQLAlchemy models + session
│   └── pyproject.toml          # Python dependencies
├── prisma/
│   └── schema.prisma           # Frontend database schema
└── docker-compose.yml          # 3-service Docker setup
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CREDENTIALS_ENCRYPTION_KEY` | Yes | AES-256 key for encrypting stored API keys |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `NEXTAUTH_SECRET` | No | Auth.js session secret (auto-generated if not set) |
| `TELEGRAM_BOT_TOKEN` | No | Telegram bot token from BotFather |
| `TELEGRAM_BOT_USERNAME` | No | Telegram bot username (without @) |
| `TELEGRAM_WEBHOOK_URL` | No | Webhook URL for production Telegram |
| `TELEGRAM_WEBHOOK_SECRET` | No | Webhook verification secret |

## Why 2.0?

The original QRev was a monolith — 70+ Python dependencies, 10 sub-projects, 104 API endpoints, 7,150-line files, and AG-Grid Enterprise at $1000/year.

QRev 2.0 is a clean-room rewrite:

- **3 Docker containers** instead of 10+ services
- **Multi-provider AI** — bring your own keys (Anthropic, OpenAI, Google, Groq)
- **Orchestrator-worker agents** — parallel execution, not sequential chains
- **Telegram gateway** — chat with your GTM agents from anywhere
- **Encrypted credentials** — AES-256-GCM, zero plaintext storage
- **Extensible Python backend** — add your own agents, providers, or integrations
- **All open source** — no enterprise licenses, no vendor lock-in

Same vision. Modern stack. Built for 2026.

<!-- CONTRIBUTORS -->

### Contributors

<a href="https://github.com/qrev-ai/qrev/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=qrev-ai/qrev" />
</a>

---

## Contributing

We welcome contributions! Whether it's new agents, provider adapters, or UI improvements.

## License

[MIT](LICENSE)
