# QRev Docker Quick Start

Get QRev running on your Mac in 5 minutes.

## Prerequisites

- Docker Desktop for Mac installed
- Google Cloud Console account (for OAuth)
- OpenAI API key

## Quick Start

### 1. Clone and Navigate
```bash
git clone https://github.com/qrev-ai/qrev.git
cd qrev
```

### 2. Create Environment File
```bash
cp .env.example .env
```

Edit `.env` with your values:
```bash
# Required
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
OPENAI_API_KEY=sk-your-openai-api-key
```

### 3. Setup Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/dashboard)
2. Create project → Enable Gmail API
3. Create OAuth 2.0 credentials:
   - Type: Web application
   - Redirect URI: `http://localhost:8080/api/google/auth/code/to/tokens`
4. Copy Client ID and Secret to `.env`

### 4. Start Everything
```bash
docker-compose up --build
```

First build takes ~5-10 minutes. Subsequent starts are fast.

### 5. Access QRev

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **AI Server**: http://localhost:8081

## Services

| Service | Port | Description |
|---------|------|-------------|
| client | 3000 | React frontend |
| server | 8080 | Node.js API |
| ai-server | 8081 | Python AI server |
| mongodb | 27017 | Database |
| chromadb | 8000 | Vector store |

## Common Commands

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f server

# Stop all services
docker-compose down

# Stop and remove volumes (reset data)
docker-compose down -v

# Rebuild after code changes
docker-compose up --build
```

## Troubleshooting

### "Port already in use"
```bash
# Check what's using the port
lsof -i :8080

# Or use different ports in docker-compose.yml
```

### "Cannot connect to MongoDB"
```bash
# Check MongoDB is running
docker-compose ps

# View MongoDB logs
docker-compose logs mongodb
```

### "Google OAuth redirect error"
- Make sure redirect URI matches exactly:
  `http://localhost:8080/api/google/auth/code/to/tokens`
- No trailing slash
- http not https for local dev

### Reset Everything
```bash
docker-compose down -v
docker system prune -a
docker-compose up --build
```

## Development Mode

For hot-reloading during development, run services individually:

```bash
# Start just the databases
docker-compose up mongodb chromadb

# Run server locally (Terminal 2)
cd server && npm install && npm start

# Run client locally (Terminal 3)
cd client && npm install && npm start
```

## Next Steps

1. Login with Google OAuth
2. Create your workspace
3. Upload a prospect CSV via QAi chat
4. Watch the AI generate personalized campaigns!
