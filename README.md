# QRev Lite 🚀

> Modern, minimal GTM platform. Built to run in under 2 minutes.

## What is QRev Lite?

A complete rewrite of QRev — the AI-native GTM (Go-To-Market) platform. Same features, 1/10th the complexity.

### Features

- **🤖 QAi Chat** — AI assistant for creating campaigns, researching prospects
- **📧 Campaign Management** — Create, preview, and manage email campaigns
- **🔍 Research Agents** — AI-powered prospect and company research
- **👥 Workspace Management** — Multi-tenant, team collaboration
- **🌙 Dark Mode** — Beautiful Superhuman-inspired dark theme

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Database | PostgreSQL + Prisma |
| Auth | NextAuth.js (Google OAuth) |
| AI | OpenAI SDK (direct, no wrappers) |
| State | Zustand |

## Quick Start

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL)
- OpenAI API key
- Google OAuth credentials

### Development

```bash
# Clone and checkout
git clone https://github.com/qrev-ai/qrev.git
cd qrev
git checkout qrev-lite

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your keys

# Start database
docker-compose up db -d

# Run migrations
npx prisma db push

# Start dev server
npm run dev
```

Open http://localhost:3000

### Docker (Production)

```bash
# Create .env with your keys
cp .env.example .env

# Start everything
docker-compose up --build
```

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://qrev:qrev@localhost:5432/qrev

# Auth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret

# AI
OPENAI_API_KEY=sk-your-openai-key
```

## Project Structure

```
qrev/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Dashboard
│   ├── chat/              # QAi chat interface
│   ├── campaigns/[id]/    # Campaign detail
│   ├── research/          # Research agents
│   └── api/               # API routes
├── components/
│   ├── ui/                # Base components
│   ├── chat/              # Chat components
│   ├── campaign/          # Campaign components
│   └── research/          # Research components
├── lib/
│   ├── ai.ts              # OpenAI wrapper
│   ├── db.ts              # Prisma client
│   └── auth.ts            # Auth config
├── prisma/
│   └── schema.prisma      # Database schema
└── docker-compose.yml     # Docker setup
```

## Why Lite?

The original QRev had:
- 70+ Python dependencies
- 10 Python sub-projects
- 104 API endpoints
- 7,150-line monolith files
- AG-Grid Enterprise ($1000/year)

QRev Lite has:
- ~25 dependencies total
- 1 unified codebase
- 15 API routes
- Modular, readable code
- All open source

Same features. 10x simpler.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

[MIT](LICENSE)
