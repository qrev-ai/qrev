# QRev Setup Guide

Complete guide for setting up QRev locally and in production.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Server Setup](#server-setup-backend)
4. [Client Setup](#client-setup-frontend)
5. [AI Server Setup](#ai-server-setup)
6. [Environment Variables Reference](#environment-variables-reference)
7. [Running Tests](#running-tests)
8. [Production Deployment](#production-deployment)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | >= 18.18.0 | Backend & Frontend runtime |
| npm | >= 9.x | Package management |
| MongoDB | >= 5.x | Primary database |
| Python | 3.11.x | AI Server |
| Poetry | >= 1.x | Python dependency management |
| Docker | >= 20.x | AI Server containerization (optional) |
| Git | Latest | Version control |

### Required Accounts & API Keys

You'll need accounts for these services:

| Service | Required | Purpose |
|---------|----------|---------|
| Google Cloud Console | Yes | OAuth login, Gmail API |
| MongoDB Atlas (or local) | Yes | Database |
| OpenAI | Yes | GPT-4 for email generation |
| ZeroBounce OR MillionVerifier | Optional | Email verification |
| Zoom Developer | Optional | Zoom integration |
| HubSpot Developer | Optional | HubSpot integration |
| SendGrid | Optional | Error reporting |
| AWS | Optional | S3 file storage |

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/qrev-ai/qrev.git
cd qrev

# Terminal 1: Start MongoDB (if local)
mongod --dbpath /path/to/data

# Terminal 2: Start Backend
cd server
npm ci
cp .env.example .env
# Edit .env with your values
npm start

# Terminal 3: Start Frontend
cd client
npm install
cp .env.example .env
# Edit .env with your values
npm start

# Terminal 4: Start AI Server (optional, for full functionality)
cd ai/projects/server
poetry install
sh scripts/run_server.sh
```

---

## Server Setup (Backend)

### 1. Navigate to Server Directory
```bash
cd server
```

### 2. Install Node Version (via nvm)
```bash
nvm install 18.18.0
nvm use 18.18.0
```

### 3. Install Dependencies
```bash
npm ci  # Uses package-lock.json for exact versions
```

### 4. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` with required values:

```bash
# Server Configuration
EXPRESS_HTTP_SERVER_PORT=8080
SERVER_URL_PATH=http://localhost:8080
ENVIRONMENT_TYPE=dev  # 'dev' disables error reporting

# JWT Secrets (generate with: openssl rand -base64 32)
REFRESH_TOKEN_JWT_SECRET="your-refresh-secret-here"
ACCESS_TOKEN_JWT_SECRET="your-access-secret-here"
REFRESH_TOKEN_EXPIRES_IN=180d
ACCESS_TOKEN_EXPIRES_IN=15m

# MongoDB
MONGO_DB_URL=mongodb://localhost:27017/qrev
# Or for Atlas: mongodb+srv://user:pass@cluster.mongodb.net/qrev

# Google OAuth (required for login)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REFRESH_URL=https://oauth2.googleapis.com/token

# AI Server
AI_BOT_SERVER_TOKEN="your-shared-secret-token"
AI_BOT_SERVER_URL=http://localhost:8081
```

### 5. Setup Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/dashboard)
2. Create a new project (or select existing)
3. Enable APIs:
   - Gmail API
4. Configure OAuth Consent Screen:
   - Add scopes: `gmail.send`, `gmail.readonly`
   - Add test users (your email)
5. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:8080/api/google/auth/code/to/tokens`
6. Copy Client ID and Secret to `.env`

### 6. Setup MongoDB

**Option A: Local MongoDB**
```bash
# macOS
brew install mongodb-community
brew services start mongodb-community

# Ubuntu
sudo apt install mongodb
sudo systemctl start mongodb
```

**Option B: MongoDB Atlas**
1. Create free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create database user
3. Whitelist your IP
4. Get connection string, add to `MONGO_DB_URL`

### 7. Start the Server
```bash
npm start  # Uses nodemon for hot reload
```

Server runs at `http://localhost:8080`

Verify: `curl http://localhost:8080/ping` should return `OK`

---

## Client Setup (Frontend)

### 1. Navigate to Client Directory
```bash
cd client
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```bash
REACT_APP_BASE_API_URL=http://localhost:8080
REACT_APP_QREV_BACKEND_HOST_URL=http://localhost:8080
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id  # Same as server
```

**Note:** URLs should NOT have trailing slashes.

### 4. Configure Line Endings (Windows)
```bash
git config --global core.autocrlf true
```

### 5. Start the Client
```bash
npm start
```

Client runs at `http://localhost:3000`

---

## AI Server Setup

The AI server handles:
- Query interpretation (understanding user intent)
- Email validation (via ZeroBounce/MillionVerifier)
- LinkedIn enrichment
- Personalized email generation

### 1. Navigate to AI Server Directory
```bash
cd ai/projects/server
```

### 2. Install Poetry (if not installed)
```bash
curl -sSL https://install.python-poetry.org | python3 -
```

### 3. Install Dependencies
```bash
poetry install
```

### 4. Configure Settings

Create config file at `~/.config/qai/config.toml`:

```toml
version = "1.1"

[openai]
api_key = "sk-your-openai-api-key"

[model]
name = "gpt-4"
temperature = 0.0

[mongo]
uri = "mongodb://localhost:27017"
db = "qrev"
collection = "ai_generated_emails"

[server]
allowed_tokens = [
    "your-shared-secret-token"  # Same as AI_BOT_SERVER_TOKEN in server .env
]

[chroma]
type = "http"
host = "localhost"
port = 8000

# Email Verification (optional)
[millionverifier]
api_key = "your-millionverifier-key"
uri = "mongodb://localhost:27017"
database = "external-sources"
collection = "email-verifications"

# LinkedIn Enrichment (optional)
[nubela]
api_key = "your-nubela-key"

[pdl]
api_key = "your-pdl-key"
```

### 5. Run Locally
```bash
sh scripts/run_server.sh
```

AI Server runs at `http://localhost:8081`

### 6. Run with Docker (Alternative)
```bash
make build
make up
```

---

## Environment Variables Reference

### Server (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPRESS_HTTP_SERVER_PORT` | Yes | Server port (default: 8080) |
| `SERVER_URL_PATH` | Yes | Full server URL |
| `ENVIRONMENT_TYPE` | Yes | `dev` or `prod` |
| `MONGO_DB_URL` | Yes | MongoDB connection string |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `REFRESH_TOKEN_JWT_SECRET` | Yes | JWT secret for refresh tokens |
| `ACCESS_TOKEN_JWT_SECRET` | Yes | JWT secret for access tokens |
| `AI_BOT_SERVER_TOKEN` | Yes | Shared secret with AI server |
| `AI_BOT_SERVER_URL` | Yes | AI server URL |
| `ZOOM_CLIENT_ID` | No | Zoom OAuth client ID |
| `ZOOM_CLIENT_SECRET` | No | Zoom OAuth client secret |
| `HUBSPOT_APP_ID` | No | HubSpot app ID |
| `HUBSPOT_CLIENT_ID` | No | HubSpot OAuth client ID |
| `HUBSPOT_CLIENT_SECRET` | No | HubSpot OAuth client secret |
| `SENDGRID_API_KEY` | No | SendGrid API key for error emails |
| `VERIFY_PROSPECT_EMAIL_BY_SERVICE` | No | `none`, `zerobounce`, or `millionverifier` |

### Client (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `REACT_APP_BASE_API_URL` | Yes | Backend API URL |
| `REACT_APP_QREV_BACKEND_HOST_URL` | Yes | Backend host URL |
| `REACT_APP_GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |

### AI Server (config.toml)

| Section | Key | Required | Description |
|---------|-----|----------|-------------|
| `openai` | `api_key` | Yes | OpenAI API key |
| `model` | `name` | Yes | Model name (e.g., `gpt-4`) |
| `mongo` | `uri` | Yes | MongoDB connection |
| `server` | `allowed_tokens` | Yes | Array of valid API tokens |
| `millionverifier` | `api_key` | No | Email verification |
| `nubela` | `api_key` | No | LinkedIn enrichment |

---

## Running Tests

### Backend Tests
```bash
cd server
npm test  # Currently shows "no test specified"
```

Note: Backend tests need to be implemented.

### Frontend Tests
```bash
cd client
npm test
```

### AI Server Tests
```bash
cd ai/projects/server
make test
# Or
poetry run pytest
```

---

## Production Deployment

### Docker Compose Setup

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"

  server:
    build: ./server
    ports:
      - "8080:8080"
    environment:
      - MONGO_DB_URL=mongodb://mongodb:27017/qrev
    depends_on:
      - mongodb

  client:
    build: ./client
    ports:
      - "3000:3000"
    depends_on:
      - server

  ai-server:
    build: ./ai/projects/server
    ports:
      - "8081:8081"
    depends_on:
      - mongodb

volumes:
  mongo_data:
```

### Server Dockerfile

Create `server/Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

EXPOSE 8080
CMD ["node", "server.js"]
```

### Client Dockerfile

Create `client/Dockerfile`:
```dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

### Production Checklist

- [ ] Set `ENVIRONMENT_TYPE=prod`
- [ ] Use strong, unique JWT secrets
- [ ] Enable HTTPS (use reverse proxy like nginx)
- [ ] Configure proper CORS origins
- [ ] Set up MongoDB authentication
- [ ] Configure rate limiting
- [ ] Set up monitoring/logging
- [ ] Configure backups for MongoDB
- [ ] Use environment-specific config files

---

## Troubleshooting

### Common Issues

#### 1. "Cannot find module" errors
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

#### 2. MongoDB Connection Refused
```bash
# Check if MongoDB is running
sudo systemctl status mongodb  # Linux
brew services list  # macOS

# Check connection string format
# Local: mongodb://localhost:27017/qrev
# Atlas: mongodb+srv://user:pass@cluster.mongodb.net/qrev
```

#### 3. Google OAuth "redirect_uri_mismatch"
- Verify redirect URI in Google Console matches exactly:
  - `http://localhost:8080/api/google/auth/code/to/tokens` (development)
- No trailing slashes
- Correct protocol (http vs https)

#### 4. CORS Errors
- Check `REACT_APP_BASE_API_URL` matches server URL
- Verify no trailing slashes in URLs
- Server has CORS enabled (default in codebase)

#### 5. AI Server "Invalid token"
- Ensure `AI_BOT_SERVER_TOKEN` in server `.env` matches `allowed_tokens` in `config.toml`

#### 6. Campaign Emails Not Sending
- Verify Google OAuth has `gmail.send` scope
- Check user has connected their Google account
- Verify campaign is in "active" status
- Check cron jobs are enabled (currently disabled by default in `cron.setup.js`)

#### 7. "Port already in use"
```bash
# Find process using port
lsof -i :8080  # or :3000, :8081

# Kill process
kill -9 <PID>
```

### Logs & Debugging

**Server Logs:**
- Uses Winston logger
- Check console output
- Set `ENVIRONMENT_TYPE=dev` for detailed errors

**Client Debugging:**
- Browser DevTools > Console
- Browser DevTools > Network tab for API calls
- Redux DevTools extension for state

**AI Server Logs:**
```bash
# Set log level
curl -X POST http://localhost:8081/set_loglevel/debug
```

### Getting Help

1. Check existing [GitHub Issues](https://github.com/qrev-ai/qrev/issues)
2. Join the [Community Slack](https://join.slack.com/t/qrev/shared_invite/zt-2gsc6omvb-L5bLaBubluDEdK5ZB133dg)
3. Review the [Server README](./server/SERVER_README.md) for integration details

---

## Next Steps After Setup

1. **Login** - Use Google OAuth to create your account
2. **Create Account/Workspace** - Set up your organization
3. **Configure Campaign Settings** - Add email senders, set schedule windows
4. **Upload Prospects** - Use QAi bot with a CSV file
5. **Review & Send** - Review generated campaign, activate sending

For detailed API documentation, see [Server README](./server/SERVER_README.md).
