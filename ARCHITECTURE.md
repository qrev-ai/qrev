# QRev Architecture Overview

> AI-Native CRM/Sales Automation Platform - Open Source Alternative to Salesforce

## High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   FRONTEND                                       │
│                          React + TypeScript (Port 3000)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   QAi Bot   │  │  Campaigns  │  │    CRM      │  │  Settings   │            │
│  │   (Agent)   │  │   Manager   │  │  (People/   │  │  (Account/  │            │
│  │             │  │             │  │  Companies) │  │   Profile)  │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │                │                │                │                    │
│         └────────────────┴────────────────┴────────────────┘                    │
│                                   │                                              │
│                          Axios + Redux Store                                     │
└──────────────────────────────────┬──────────────────────────────────────────────┘
                                   │ REST API + WebSocket
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              APP SERVER (Node.js)                                │
│                          Express.js Backend (Port 8080)                         │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                              API Routes                                   │   │
│  │  /api/auth      - JWT Authentication (access + refresh tokens)           │   │
│  │  /api/google    - Google OAuth (Gmail integration)                       │   │
│  │  /api/user      - User profile & settings                                │   │
│  │  /api/account   - Workspace/organization management                      │   │
│  │  /api/team      - Team management                                        │   │
│  │  /api/qai       - QAi bot conversations & campaign creation              │   │
│  │  /api/campaign  - Campaign sequences, scheduling, execution              │   │
│  │  /api/agent     - Agent management & status                              │   │
│  │  /api/crm/*     - Contact, Company, Opportunity, Pipeline management     │   │
│  │  /api/hubspot   - HubSpot OAuth integration                              │   │
│  │  /api/zoom      - Zoom OAuth integration                                 │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │   WebSocket     │  │   Cron Jobs     │  │      Middleware                 │  │
│  │  (Agent Status) │  │  (Campaign      │  │  - JWT verification             │  │
│  │                 │  │   execution)    │  │  - Request logging              │  │
│  └─────────────────┘  └─────────────────┘  │  - Error handling               │  │
│                                            └─────────────────────────────────┘  │
└───────────────────────────────────┬─────────────────────────────────────────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           │                        │                        │
           ▼                        ▼                        ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────────────┐
│      MongoDB        │  │    AI Server        │  │   External Services         │
│   (Primary DB)      │  │    (Python/Flask)   │  │                             │
│                     │  │    (Port 8081)      │  │  - Google APIs (Gmail)      │
│  Collections:       │  │                     │  │  - HubSpot API              │
│  - users            │  │  ┌───────────────┐  │  │  - Zoom API                 │
│  - accounts         │  │  │ LangChain/    │  │  │  - SendGrid (email)        │
│  - contacts         │  │  │ LlamaIndex    │  │  │  - OpenAI GPT-4            │
│  - companies        │  │  │               │  │  │  - ZeroBounce/             │
│  - sequences        │  │  └───────────────┘  │  │    MillionVerifier         │
│  - sequence.steps   │  │                     │  │  - AWS S3                   │
│  - sequence.prospects│ │  ┌───────────────┐  │  │  - Nubela (LinkedIn)       │
│  - conversations    │  │  │ Email Gen     │  │  │  - PDL (People Data)       │
│  - agents           │  │  │ & Validation  │  │  │  - Unipile (LinkedIn)      │
│  - pipelines        │  │  └───────────────┘  │  └─────────────────────────────┘
│  - opportunities    │  │                     │
│  - tokens           │  │  ┌───────────────┐  │
│  - integrations     │  │  │ ChromaDB      │  │
│                     │  │  │ (Vector DB)   │  │
└─────────────────────┘  │  └───────────────┘  │
                         │                     │
                         │  ┌───────────────┐  │
                         │  │ SQLite/MySQL  │  │
                         │  │ (SQLAlchemy)  │  │
                         │  └───────────────┘  │
                         └─────────────────────┘
```

## Component Breakdown

### 1. Frontend (Client)

**Location:** `/client`

**Tech Stack:**
- React 18 with TypeScript
- Redux + Redux Persist for state management
- React Router v6 for navigation
- AG-Grid for data tables (CRM views)
- Material UI + Tailwind CSS for styling
- Axios for HTTP requests

**Key Pages:**
- `/` - QAi Agent Bot (main interface)
- `/campaigns` - Campaign list & email views
- `/campaigns/details` - Campaign metrics, prospects, meetings
- `/crm` - People and Companies tables
- `/apps` - Integration apps (Zoom, HubSpot)
- `/settings` - Profile, Account, Campaign config, Teams

**State Management:**
- Redux store with reducers for user state
- Persistent storage via redux-persist + localforage

### 2. App Server (Backend)

**Location:** `/server`

**Tech Stack:**
- Node.js 18+ with ES Modules
- Express.js framework
- MongoDB with Mongoose ODM
- JWT for authentication
- WebSocket (ws) for real-time updates
- node-cron for scheduled tasks

**Key Utilities:**
| Directory | Purpose |
|-----------|---------|
| `/utils/auth` | JWT token generation, verification |
| `/utils/google` | Google OAuth, Gmail API integration |
| `/utils/campaign` | Campaign creation, scheduling, execution |
| `/utils/qai` | QAi bot conversations, AI server communication |
| `/utils/crm` | Contact/Company CRUD operations |
| `/utils/agents` | Agent status tracking |
| `/utils/integration` | Zoom, HubSpot OAuth flows |

**API Authentication Flow:**
1. User authenticates via Google OAuth
2. Backend exchanges code for Google tokens
3. Backend issues JWT access token (15min) + refresh token (180d)
4. Frontend stores tokens, includes access token in requests
5. Middleware verifies JWT on protected routes

### 3. AI Server

**Location:** `/ai`

**Tech Stack:**
- Python 3.11
- Flask for REST API
- LlamaIndex for AI agent framework
- LangChain for LLM tooling
- ChromaDB for vector storage
- OpenAI GPT-4 for generation
- Poetry for dependency management

**Project Structure:**
| Project | Purpose |
|---------|---------|
| `server` | Main Flask API server |
| `agent` | LlamaIndex-based agents (email generation) |
| `chat` | RAG-based chat system |
| `chroma-server` | ChromaDB HTTP server |
| `core` | Shared utilities |
| `schema` | Pydantic models for Person, Company, Email |
| `scraper` | Web scraping utilities |
| `storage` | AWS S3, history management |

**Key Endpoints:**
- `POST /flaskapi/query_interpreter` - Parse user query into actions
- `POST /flaskapi/email_validation_enrichment_generation/upload` - Campaign job pipeline

### 4. Database Schema

**MongoDB Collections:**

```
users
├── email (unique)
├── google_oauths[] → GoogleOauth
├── profile_*
└── timezone

accounts
├── name
├── domain
├── owner → User
└── created_on

crm.contact
├── account → Account
├── first_name, last_name, email
├── status (new|qualified|accepted|...)
├── company → Company
└── reseller → Reseller

crm.company
├── account → Account
├── name, domain
├── industry, size
└── contacts[]

sequence
├── account → Account
├── created_by → User
├── conversation → QaiConversation
├── status
└── activities[]

sequence.step
├── sequence → Sequence
├── type (email|linkedin_connection_request)
├── draft_type (ai_generated|fixed|none)
├── time_of_dispatch
└── order

sequence.prospect
├── sequence → Sequence
├── contact → Contact
├── prospect_email, prospect_timezone
└── status (pending|sent|replied|...)

sequence.prospect.message_schedule
├── sequence_prospect → SequenceProspect
├── sequence_step → SequenceStep
├── sender_email, sender → User
├── message_scheduled_time
├── message_status
├── message_subject, message_body
└── reply_to

qai.conversation
├── account → Account
├── owner → User
├── title
└── messages[]

agent
├── account → Account
├── name, description, type
├── artifact_type
└── is_sharing_enabled

pipeline
├── account → Account
├── name
└── stages[] → PipelineStage

opportunity
├── account → Account
├── pipeline → Pipeline
├── stage → PipelineStage
├── contact → Contact
├── company → Company
└── value, probability
```

## Data Flow

### Campaign Creation Flow

```
1. User uploads CSV + enters query in QAi Bot
                    │
                    ▼
2. Frontend → POST /api/qai/converse (multipart with file)
                    │
                    ▼
3. Backend parses CSV, calls AI Server query_interpreter
                    │
                    ▼
4. AI Server returns actions (e.g., "generate_campaign")
                    │
                    ▼
5. Backend creates:
   - Sequence document
   - SequenceStep documents (from campaign config template)
   - Contacts in CRM
                    │
                    ▼
6. Backend calls AI Server email_validation_enrichment_generation
   with async callback URL
                    │
                    ▼
7. AI Server (async):
   a. Validates emails (MillionVerifier/ZeroBounce)
   b. Enriches prospects (LinkedIn data via Nubela/PDL)
   c. Generates personalized emails for each step/prospect
   d. Calls callback URL when complete
                    │
                    ▼
8. Backend updates SequenceProspectMessageSchedule with generated content
                    │
                    ▼
9. User reviews campaign in UI, clicks "Send"
                    │
                    ▼
10. Backend schedules messages:
    - Assigns sender rotation
    - Calculates send times (respecting timezone, limits)
    - Creates message_schedule entries
                    │
                    ▼
11. Cron job executes scheduled messages via Gmail API
```

### Email Sending Limits

The system implements sophisticated rate limiting:
- **Per Hour:** 20 emails per sender
- **Per Day:** 50 emails per sender (configurable)
- **Domain Threading:** 2-day buffer between emails to same company domain
- **Timezone Aware:** Messages scheduled in prospect's local time
- **Schedule Windows:** Configurable hours (default Mon-Fri 9am-10pm)

## Key Design Decisions

### 1. Superagent Architecture (Qai)
Instead of multiple distinct "digital workers" (SDR bot, BDR bot), QRev uses a single Qai superagent that coordinates internal agents. This simplifies UX while allowing specialized agents internally:
- **Research Agent** - Prospect enrichment
- **Campaign Agent** - Email generation
- **Docs Agent** - Document processing

### 2. Multi-Tenant Workspace Model
- Users belong to **Accounts** (workspaces/organizations)
- All resources (contacts, campaigns, etc.) are scoped to accounts
- Users can belong to multiple accounts
- Teams provide sub-organization grouping

### 3. Async AI Processing
Campaign generation is asynchronous:
- Backend initiates job with callback URL
- AI server processes in background
- AI server notifies backend when complete
- Enables handling large prospect lists without timeout

### 4. Template-Driven Email Generation
Rather than pure AI generation, the system uses:
- **Requirement Rules** - Constraints for AI (26+ rules)
- **Message Templates** - HTML templates per step type
- Templates guide AI while allowing personalization

### 5. Sender Rotation & Deliverability
- Multiple senders can be configured per campaign
- System rotates between senders
- Rate limits prevent email provider blocks
- Email verification (ZeroBounce/MillionVerifier) removes invalid addresses

## External Integrations

| Service | Purpose | Auth Type |
|---------|---------|-----------|
| Google | Gmail send/read, OAuth login | OAuth 2.0 |
| Zoom | Meeting scheduling | OAuth 2.0 |
| HubSpot | CRM sync | OAuth 2.0 |
| SendGrid | Error notification emails | API Key |
| OpenAI | GPT-4 for email generation | API Key |
| ZeroBounce | Email verification | API Key |
| MillionVerifier | Email verification | API Key |
| Nubela | LinkedIn enrichment | API Key |
| PDL (PeopleDataLabs) | Contact enrichment | API Key |
| AWS S3 | File storage | IAM |
| Unipile | LinkedIn automation | Account ID |

## Security Considerations

1. **JWT Tokens** - Short-lived access tokens, long-lived refresh tokens
2. **OAuth Secrets** - Stored in environment variables
3. **API Token Auth** - AI server validates shared secret
4. **CORS** - Configured for frontend origin
5. **Input Validation** - Mongoose schema validation
6. **Error Reporting** - SendGrid notifications to team (opt-in)

## Scalability Notes

Current architecture considerations:
- MongoDB handles document storage well for CRM data
- ChromaDB for vector search (RAG capabilities)
- WebSocket for real-time agent status
- Cron-based execution (could move to queue-based for scale)
- AI server is stateless (can horizontally scale)

**Potential Improvements:**
- Message queue (Redis/RabbitMQ) for campaign execution
- Database read replicas for reporting
- CDN for static assets
- Kubernetes for container orchestration
