# QREV GTM Agent Platform - Architecture Plan

## Vision

Transform QREV from a single-AI-chat GTM tool into an **agent-powered GTM platform** inspired by OpenClaw's multi-agent gateway architecture and Anthropic's orchestrator-worker pattern. Users connect their own LLM keys and email provider credentials, and the platform orchestrates specialized GTM agents that work as a team.

---

## Current State (QREV Today)

- **Stack**: Next.js 14, PostgreSQL/Prisma, OpenAI SDK (GPT-4o only)
- **AI**: Single `QAi` chat endpoint with 3 functions (chat, generateEmail, researchProspect)
- **Email**: Draft generation only — no sending infrastructure
- **CRM**: Prospects, companies, campaigns with step-based templates
- **Auth**: Google OAuth + NextAuth, workspace-based multi-tenancy
- **Legacy** (`qrev-main/`): Has Gmail API, SendGrid, LlamaIndex agents, but is deprecated

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    QREV GTM Platform                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │  Next.js UI  │───│  API Layer   │───│  Agent Engine  │  │
│  │  (React)     │   │  (Routes)    │   │  (Orchestrator)│  │
│  └─────────────┘    └──────────────┘    └───────┬───────┘  │
│                                                  │          │
│                    ┌─────────────────────────────┤          │
│                    │                             │          │
│         ┌─────────┴─────────┐     ┌─────────────┴────────┐ │
│         │  Provider Registry │     │   Agent Registry     │ │
│         │  ┌──────────────┐ │     │  ┌────────────────┐  │ │
│         │  │ LLM Providers│ │     │  │ ResearchAgent  │  │ │
│         │  │ - OpenAI     │ │     │  │ EmailAgent     │  │ │
│         │  │ - Anthropic  │ │     │  │ CampaignAgent  │  │ │
│         │  │ - Google     │ │     │  │ EnrichmentAgent│  │ │
│         │  │ - Ollama     │ │     │  │ AnalyticsAgent │  │ │
│         │  └──────────────┘ │     │  │ QAi (Super)    │  │ │
│         │  ┌──────────────┐ │     │  └────────────────┘  │ │
│         │  │Email Providers│ │     └──────────────────────┘ │
│         │  │ - SendGrid   │ │                               │
│         │  │ - Gmail API  │ │     ┌──────────────────────┐  │
│         │  │ - Mailgun    │ │     │   Task System        │  │
│         │  │ - Resend     │ │     │  (Shared task list,  │  │
│         │  │ - AWS SES    │ │     │   agent coordination)│  │
│         │  └──────────────┘ │     └──────────────────────┘  │
│         └───────────────────┘                               │
│                                                             │
│         ┌───────────────────────────────────────────────┐   │
│         │              PostgreSQL + Prisma               │   │
│         │  Users, Workspaces, Credentials, Agents,      │   │
│         │  Tasks, Campaigns, Prospects, Conversations    │   │
│         └───────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Provider Abstraction Layer

**Goal**: Decouple from OpenAI, support multiple LLM and email providers.

### 1A. LLM Provider Registry (`lib/providers/llm/`)

```
lib/providers/
├── llm/
│   ├── index.ts              # LLMProviderRegistry + factory
│   ├── types.ts              # Provider interface + model types
│   ├── openai.ts             # OpenAI adapter
│   ├── anthropic.ts          # Anthropic Claude adapter
│   ├── google.ts             # Google Gemini adapter
│   ├── ollama.ts             # Ollama (local) adapter
│   └── cost-calculator.ts    # Token cost tracking per model
```

**Core interface**:
```typescript
interface LLMProvider {
  id: string;                          // "openai", "anthropic", etc.
  name: string;
  models: ModelDefinition[];

  chat(params: ChatParams): AsyncIterable<ChatChunk>;
  complete(params: CompleteParams): Promise<CompleteResult>;

  validateCredentials(credentials: ProviderCredentials): Promise<boolean>;
  estimateCost(model: string, inputTokens: number, outputTokens: number): number;
}

interface ModelDefinition {
  id: string;                          // "gpt-4o", "claude-opus-4-6"
  name: string;
  provider: string;
  contextWindow: number;
  inputCostPer1M: number;
  outputCostPer1M: number;
  capabilities: ("chat" | "json" | "vision" | "streaming")[];
  tier: "fast" | "balanced" | "premium"; // For cost optimization routing
}
```

**Key patterns from OpenClaw**:
- Models referenced as `provider/model` (e.g., `anthropic/claude-opus-4-6`)
- Auth profile rotation on failure (try next credential if one fails)
- Provider-level credential validation

### 1B. Email Provider Registry (`lib/providers/email/`)

```
lib/providers/
├── email/
│   ├── index.ts              # EmailProviderRegistry + factory
│   ├── types.ts              # Provider interface
│   ├── sendgrid.ts           # SendGrid adapter
│   ├── gmail.ts              # Gmail API adapter (OAuth)
│   ├── resend.ts             # Resend adapter
│   ├── mailgun.ts            # Mailgun adapter
│   ├── ses.ts                # AWS SES adapter
│   └── rate-limiter.ts       # Per-provider rate limiting
```

**Core interface**:
```typescript
interface EmailProvider {
  id: string;
  name: string;

  send(params: SendEmailParams): Promise<SendResult>;
  validateCredentials(credentials: ProviderCredentials): Promise<boolean>;
  getRateLimits(): RateLimits;
  getDeliverabilityInfo?(): Promise<DeliverabilityInfo>;
}
```

### 1C. Credential Store (Database)

**New Prisma models**:
```prisma
model ProviderCredential {
  id          String    @id @default(cuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id])

  providerType String   // "llm" | "email" | "enrichment"
  providerId   String   // "openai" | "sendgrid" | etc.

  credentials  Json     // Encrypted: { apiKey, oauth tokens, etc. }
  isActive     Boolean  @default(true)
  isValid      Boolean  @default(true)  // Set false on auth failure

  // For LLM providers
  preferredModel String?  // Default model for this provider
  monthlyBudget  Float?   // Optional spending cap

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

**Encryption**: Use `@prisma/client` + Node.js `crypto` for AES-256-GCM encryption of stored credentials. Encryption key from env var `CREDENTIALS_ENCRYPTION_KEY`.

### 1D. Settings UI (`app/settings/providers/`)

- Page to connect LLM providers (add API key, select default model)
- Page to connect email providers (API key or OAuth flow for Gmail)
- Per-provider status indicator (valid/invalid credentials)
- Cost tracking dashboard per workspace

---

## Phase 2: Agent Engine

**Goal**: Build the orchestration layer where QAi becomes the "super agent" that delegates to specialized sub-agents.

### 2A. Agent Framework (`lib/agents/`)

```
lib/agents/
├── engine.ts                 # AgentEngine - runs agents
├── registry.ts               # AgentRegistry - all available agents
├── types.ts                  # Agent interfaces
├── orchestrator.ts           # Super-agent (QAi) orchestration logic
├── task-system.ts            # Shared task list for coordination
├── agents/
│   ├── research.ts           # ProspectResearchAgent
│   ├── email-writer.ts       # EmailWriterAgent
│   ├── email-sender.ts       # EmailSenderAgent
│   ├── campaign-planner.ts   # CampaignPlannerAgent
│   ├── enrichment.ts         # DataEnrichmentAgent
│   ├── analytics.ts          # CampaignAnalyticsAgent
│   └── qualifier.ts          # LeadQualificationAgent
└── tools/
    ├── crm-tools.ts          # Read/write prospects, companies
    ├── email-tools.ts        # Send email, check deliverability
    ├── search-tools.ts       # Web search, LinkedIn lookup
    ├── campaign-tools.ts     # Create/update campaigns
    └── analytics-tools.ts    # Query campaign metrics
```

**Core interfaces** (inspired by OpenClaw + Anthropic patterns):

```typescript
interface Agent {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;

  // Which LLM tier this agent needs
  modelTier: "fast" | "balanced" | "premium";

  // Tools this agent can use
  tools: Tool[];

  // Execute the agent
  run(params: AgentRunParams): AsyncIterable<AgentEvent>;
}

interface Tool {
  name: string;
  description: string;
  inputSchema: ZodSchema;
  handler: (input: unknown, context: ToolContext) => Promise<ToolResult>;
}

interface AgentRunParams {
  messages: Message[];
  workspaceId: string;
  sessionId: string;

  // Provider routing
  llmProvider?: string;     // Override default
  model?: string;           // Override default
}
```

### 2B. Orchestrator Pattern (QAi as Super-Agent)

Following Anthropic's research system architecture:

```typescript
// orchestrator.ts
class QAiOrchestrator {
  /**
   * QAi is the user-facing "super agent" that:
   * 1. Analyzes user intent
   * 2. Decides which sub-agents to spawn
   * 3. Coordinates parallel execution
   * 4. Synthesizes results back to user
   */

  async run(userMessage: string, context: OrchestratorContext) {
    // Step 1: QAi analyzes the request with a planning prompt
    const plan = await this.plan(userMessage, context);

    // Step 2: Spawn sub-agents in parallel based on plan
    const tasks = plan.subtasks.map(task =>
      this.spawnSubAgent(task.agentId, task.objective, context)
    );

    // Step 3: Await results (with streaming progress to user)
    const results = await Promise.allSettled(tasks);

    // Step 4: QAi synthesizes results
    return this.synthesize(userMessage, results, context);
  }
}
```

**Model cost optimization** (from Anthropic's research):
- **Super-agent (QAi orchestrator)**: Use premium model (Claude Opus / GPT-4o) for planning & synthesis
- **Sub-agents**: Use balanced/fast models (Claude Sonnet / GPT-4o-mini) for execution
- This matches Anthropic's finding: Opus lead + Sonnet workers outperformed single Opus by 90%

### 2C. Task System (Agent Coordination)

Inspired by Claude Code's TeammateTool shared task list:

```prisma
model AgentTask {
  id          String   @id @default(cuid())
  workspaceId String
  sessionId   String   // Links to conversation

  parentTaskId String?          // For sub-tasks
  parentTask   AgentTask?       @relation("SubTasks", fields: [parentTaskId], references: [id])
  subTasks     AgentTask[]      @relation("SubTasks")

  agentId     String            // Which agent owns this
  status      AgentTaskStatus   // PENDING, IN_PROGRESS, COMPLETED, FAILED

  objective   String            // What the agent needs to do
  result      Json?             // Agent output

  // Cost tracking
  tokensUsed  Int       @default(0)
  modelUsed   String?
  costUsd     Float     @default(0)

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

enum AgentTaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  FAILED
}
```

---

## Phase 3: Specialized GTM Agents

### 3A. Agent Definitions

| Agent | Role | Model Tier | Key Tools |
|-------|------|-----------|-----------|
| **QAi** (Orchestrator) | User-facing super-agent. Plans, delegates, synthesizes. | Premium | All tools (via delegation) |
| **ResearchAgent** | Researches prospects, companies, industries | Balanced | web_search, linkedin_lookup, crm_read |
| **EmailWriterAgent** | Generates personalized email sequences | Balanced | crm_read, email_draft, campaign_read |
| **EmailSenderAgent** | Manages email delivery, tracks bounces | Fast | email_send, crm_update, rate_check |
| **CampaignPlannerAgent** | Plans multi-step campaigns, timing, A/B tests | Premium | campaign_create, crm_query, analytics_read |
| **EnrichmentAgent** | Enriches prospect data (title, company, etc.) | Fast | enrichment_api, crm_update, linkedin_lookup |
| **QualifierAgent** | Scores and qualifies leads based on ICP | Balanced | crm_read, analytics_read, score_lead |
| **AnalyticsAgent** | Analyzes campaign performance, suggests improvements | Balanced | analytics_query, campaign_read |

### 3B. Example Workflow: "Run a campaign for these 50 prospects"

```
User: "Create an outreach campaign for the prospects I uploaded"
  │
  ▼
[QAi Orchestrator] — Premium model
  │ Plans: "I need to research, write emails, and set up the campaign"
  │
  ├── [EnrichmentAgent] (parallel) — Fast model
  │   └── Enriches all 50 prospects (title, company, LinkedIn)
  │
  ├── [ResearchAgent] (parallel, per-batch) — Balanced model
  │   ├── Research batch 1 (prospects 1-10)
  │   ├── Research batch 2 (prospects 11-20)
  │   └── ... (5 parallel sub-agents)
  │
  ▼ (after enrichment + research complete)
  │
  ├── [CampaignPlannerAgent] — Premium model
  │   └── Designs 3-step sequence, timing, subject line variants
  │
  ├── [EmailWriterAgent] (parallel, per-prospect) — Balanced model
  │   └── Generates personalized emails using research data
  │
  ▼ (after emails written)
  │
  └── [QAi] synthesizes → presents campaign to user for review
      │
      ▼ (user approves)
      │
      └── [EmailSenderAgent] — Fast model
          └── Schedules sends with rate limiting per provider
```

---

## Phase 4: Model Router & Cost Optimizer

### 4A. Model Router (`lib/providers/llm/router.ts`)

```typescript
class ModelRouter {
  /**
   * Routes agent requests to the best model based on:
   * 1. Agent's required tier (fast/balanced/premium)
   * 2. User's connected providers & budget
   * 3. Current cost tracking
   * 4. Provider availability (failover)
   */

  async selectModel(request: ModelRequest): Promise<SelectedModel> {
    const availableProviders = await this.getActiveProviders(request.workspaceId);
    const budget = await this.getRemainingBudget(request.workspaceId);

    // Filter models by tier requirement
    const candidates = this.filterByTier(availableProviders, request.tier);

    // Sort by cost-effectiveness within tier
    const ranked = this.rankByCostEffectiveness(candidates, budget);

    // Return best option with fallback chain
    return { primary: ranked[0], fallbacks: ranked.slice(1) };
  }
}
```

### 4B. Cost Tracking

```prisma
model UsageLog {
  id          String   @id @default(cuid())
  workspaceId String

  providerId  String   // "openai", "anthropic"
  model       String   // "gpt-4o-mini"
  agentId     String   // "research", "email-writer"
  taskId      String?  // Link to AgentTask

  inputTokens  Int
  outputTokens Int
  costUsd      Float

  createdAt   DateTime @default(now())
}
```

---

## Phase 5: Database Schema Changes

### New/Modified Prisma Models Summary

```prisma
// NEW: Provider credentials (encrypted)
model ProviderCredential { ... }

// NEW: Agent task coordination
model AgentTask { ... }

// NEW: Usage/cost tracking
model UsageLog { ... }

// NEW: Agent session (conversation context per agent)
model AgentSession {
  id          String   @id @default(cuid())
  workspaceId String
  agentId     String
  conversationId String?

  messages    Json     // JSONL-style message history
  metadata    Json?    // Agent-specific state

  tokenCount  Int      @default(0)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// MODIFIED: Campaign - add agent tracking
model Campaign {
  // ... existing fields ...
  agentTaskId  String?  // Link to the orchestrating task
}
```

---

## Phase 6: API Routes

### New Routes

```
Settings / Providers
├── GET    /api/settings/providers              # List connected providers
├── POST   /api/settings/providers              # Connect a provider
├── PUT    /api/settings/providers/[id]         # Update credentials
├── DELETE /api/settings/providers/[id]         # Disconnect
├── POST   /api/settings/providers/[id]/test    # Validate credentials

Agent Execution
├── POST   /api/agents/run                      # Run orchestrator (streaming)
├── GET    /api/agents/tasks                    # List active tasks
├── GET    /api/agents/tasks/[id]               # Task status + result

Usage & Billing
├── GET    /api/usage                           # Usage summary
├── GET    /api/usage/breakdown                 # Per-agent, per-model breakdown
```

---

## Phase 7: UI Changes

### New Pages/Components

1. **Settings > Providers** (`app/settings/providers/page.tsx`)
   - Cards for each provider type (LLM, Email)
   - Connect/disconnect flow
   - API key input with validation
   - Gmail OAuth connect button
   - Default model selector per provider

2. **Settings > Models** (`app/settings/models/page.tsx`)
   - Table of available models (from connected providers)
   - Set default model per agent type (or "auto" for cost optimization)
   - Monthly budget cap setting

3. **Agent Activity Panel** (sidebar in QAi chat)
   - Real-time task tree showing sub-agent progress
   - Token/cost counter per task
   - Ability to cancel running tasks

4. **Usage Dashboard** (`app/settings/usage/page.tsx`)
   - Charts: daily spend, per-agent breakdown, per-model usage
   - Budget alerts

---

## Implementation Order

### Sprint 1: Provider Abstraction (Foundation)
1. `lib/providers/llm/types.ts` - LLM provider interface
2. `lib/providers/llm/openai.ts` - OpenAI adapter (migrate existing code)
3. `lib/providers/llm/anthropic.ts` - Anthropic adapter
4. `lib/providers/llm/index.ts` - Registry + factory
5. Prisma schema: `ProviderCredential` model
6. `lib/providers/credentials.ts` - Encrypted credential store
7. API routes: `/api/settings/providers`
8. UI: Settings > Providers page
9. Refactor `lib/ai.ts` to use provider registry instead of direct OpenAI

### Sprint 2: Email Provider Layer
1. `lib/providers/email/types.ts` - Email provider interface
2. `lib/providers/email/sendgrid.ts` - SendGrid adapter
3. `lib/providers/email/resend.ts` - Resend adapter
4. `lib/providers/email/gmail.ts` - Gmail OAuth adapter
5. `lib/providers/email/rate-limiter.ts` - Rate limiting
6. UI: Email provider connection in Settings
7. Integrate with Campaign execution

### Sprint 3: Agent Engine Core
1. `lib/agents/types.ts` - Agent + Tool interfaces
2. `lib/agents/engine.ts` - Agent execution engine
3. `lib/agents/tools/` - CRM tools, email tools
4. Prisma schema: `AgentTask`, `AgentSession`, `UsageLog`
5. Convert existing `lib/ai.ts` functions into proper agents
6. API routes: `/api/agents/run`, `/api/agents/tasks`

### Sprint 4: Orchestrator + Sub-Agents
1. `lib/agents/orchestrator.ts` - QAi super-agent
2. `lib/agents/agents/research.ts` - Research agent
3. `lib/agents/agents/email-writer.ts` - Email writer agent
4. `lib/agents/agents/email-sender.ts` - Email sender agent
5. `lib/agents/task-system.ts` - Task coordination
6. UI: Agent activity panel in chat

### Sprint 5: Cost Optimization + Analytics
1. `lib/providers/llm/router.ts` - Model router
2. `lib/providers/llm/cost-calculator.ts` - Cost tracking
3. API routes: `/api/usage`
4. UI: Usage dashboard
5. Budget caps and alerts

### Sprint 6: Advanced Agents + Campaign Execution
1. `lib/agents/agents/campaign-planner.ts`
2. `lib/agents/agents/enrichment.ts`
3. `lib/agents/agents/qualifier.ts`
4. `lib/agents/agents/analytics.ts`
5. Campaign execution engine (cron-based sender)
6. Full end-to-end campaign workflow

---

## Key Design Decisions

### 1. Why Provider Abstraction First
Everything depends on being able to call different LLMs and email services. Building this foundation first means agents can be provider-agnostic from day one.

### 2. Why Orchestrator-Worker (not Mesh)
Per Anthropic's research: orchestrator-worker outperforms mesh patterns for GTM tasks because:
- Campaign workflows are naturally hierarchical (plan → research → write → send)
- The super-agent can budget token spend across sub-agents
- Easier to debug and monitor than peer-to-peer agent communication
- 90% better results than single-agent approach

### 3. Why Model Tier Routing
Not all agents need the most expensive model:
- Research/email-writing needs good reasoning → balanced tier
- Email sending/enrichment is mechanical → fast tier
- Planning/synthesis needs best reasoning → premium tier
- This optimizes cost by 3-5x vs. using premium everywhere

### 4. Why Shared Task System
Inspired by Claude Code's TeammateTool:
- Agents coordinate through a shared task list, not direct messaging
- Reduces coupling between agents
- Makes progress visible to users
- Enables pause/resume of multi-step workflows

### 5. Why Not a Separate Agent Server
Unlike `qrev-main/`'s separate Python AI server, we keep agents in the same Next.js process:
- Simpler deployment (one container)
- Shared database access via Prisma
- No RPC overhead
- Can scale horizontally with Next.js instances later

---

## File Structure (Final)

```
qrev/
├── app/
│   ├── api/
│   │   ├── agents/
│   │   │   ├── run/route.ts           # POST - run orchestrator
│   │   │   └── tasks/
│   │   │       ├── route.ts           # GET - list tasks
│   │   │       └── [id]/route.ts      # GET - task detail
│   │   ├── settings/
│   │   │   └── providers/
│   │   │       ├── route.ts           # GET/POST providers
│   │   │       └── [id]/
│   │   │           ├── route.ts       # PUT/DELETE provider
│   │   │           └── test/route.ts  # POST - validate
│   │   ├── usage/
│   │   │   ├── route.ts              # GET - usage summary
│   │   │   └── breakdown/route.ts    # GET - detailed breakdown
│   │   └── ... (existing routes)
│   ├── settings/
│   │   ├── providers/page.tsx         # Provider management UI
│   │   ├── models/page.tsx            # Model configuration UI
│   │   └── usage/page.tsx             # Usage dashboard
│   └── ... (existing pages)
├── lib/
│   ├── providers/
│   │   ├── llm/
│   │   │   ├── types.ts
│   │   │   ├── index.ts              # LLMProviderRegistry
│   │   │   ├── openai.ts
│   │   │   ├── anthropic.ts
│   │   │   ├── google.ts
│   │   │   ├── ollama.ts
│   │   │   ├── router.ts             # ModelRouter
│   │   │   └── cost-calculator.ts
│   │   ├── email/
│   │   │   ├── types.ts
│   │   │   ├── index.ts              # EmailProviderRegistry
│   │   │   ├── sendgrid.ts
│   │   │   ├── gmail.ts
│   │   │   ├── resend.ts
│   │   │   ├── mailgun.ts
│   │   │   ├── ses.ts
│   │   │   └── rate-limiter.ts
│   │   └── credentials.ts            # Encrypted credential store
│   ├── agents/
│   │   ├── types.ts                   # Agent, Tool interfaces
│   │   ├── engine.ts                  # AgentEngine
│   │   ├── registry.ts                # AgentRegistry
│   │   ├── orchestrator.ts            # QAi super-agent
│   │   ├── task-system.ts             # Shared task coordination
│   │   ├── agents/
│   │   │   ├── research.ts
│   │   │   ├── email-writer.ts
│   │   │   ├── email-sender.ts
│   │   │   ├── campaign-planner.ts
│   │   │   ├── enrichment.ts
│   │   │   ├── qualifier.ts
│   │   │   └── analytics.ts
│   │   └── tools/
│   │       ├── crm-tools.ts
│   │       ├── email-tools.ts
│   │       ├── search-tools.ts
│   │       ├── campaign-tools.ts
│   │       └── analytics-tools.ts
│   └── ... (existing lib files)
├── prisma/
│   └── schema.prisma                  # Updated with new models
└── ... (existing files)
```

---

## References

- [Anthropic: How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)
- [Anthropic Opus 4.6 Agent Teams](https://techcrunch.com/2026/02/05/anthropic-releases-opus-4-6-with-new-agent-teams/)
- [OpenClaw Repository](https://github.com/openclaw/openclaw.git) - Multi-channel agent gateway architecture
- [Claude Code TeammateTool](https://paddo.dev/blog/claude-code-hidden-swarm/) - Shared task list pattern
