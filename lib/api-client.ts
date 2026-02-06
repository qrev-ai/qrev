/**
 * API client for the Python backend (FastAPI).
 * Handles provider management, agent orchestration, and usage tracking.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.json();
}

// ── Provider Management ─────────────────────────────

export interface CredentialField {
  key: string;
  label: string;
  type: 'password' | 'text';
  placeholder: string;
  required: boolean;
}

export interface AvailableProvider {
  id: string;
  name: string;
  type: 'llm' | 'email';
  models?: {
    id: string;
    name: string;
    tier: string;
    context_window: number;
    input_cost_per_1m: number;
    output_cost_per_1m: number;
  }[];
  credential_fields?: CredentialField[];
}

export interface ConnectedProvider {
  id: string;
  provider_type: string;
  provider_id: string;
  is_active: boolean;
  is_valid: boolean;
  preferred_model: string | null;
  monthly_budget: number | null;
}

export async function getAvailableProviders(): Promise<AvailableProvider[]> {
  return fetchAPI('/providers/available');
}

export async function getConnectedProviders(workspaceId: string): Promise<ConnectedProvider[]> {
  return fetchAPI(`/providers/${workspaceId}`);
}

export async function connectProvider(params: {
  workspace_id: string;
  provider_type: string;
  provider_id: string;
  credentials: Record<string, string>;
  preferred_model?: string;
}): Promise<ConnectedProvider> {
  return fetchAPI('/providers/connect', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function validateProvider(credentialId: string): Promise<{ valid: boolean }> {
  return fetchAPI(`/providers/${credentialId}/validate`, { method: 'POST' });
}

export async function disconnectProvider(credentialId: string): Promise<void> {
  await fetchAPI(`/providers/${credentialId}`, { method: 'DELETE' });
}

// ── Chat (SSE streaming) ────────────────────────────

export function chatStream(
  workspaceId: string,
  messages: { role: string; content: string }[],
  onEvent: (event: { type: string; data: Record<string, unknown> }) => void,
  onDone: () => void,
): AbortController {
  const controller = new AbortController();

  fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspace_id: workspaceId, messages }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok || !res.body) {
        onEvent({ type: 'error', data: { text: `Error: ${res.status}` } });
        onDone();
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            const eventType = line.slice(6).trim();
            // Next line should be data:
            continue;
          }
          if (line.startsWith('data:')) {
            try {
              const data = JSON.parse(line.slice(5).trim());
              onEvent({ type: data.type || 'text', data });
            } catch {
              // skip malformed
            }
          }
        }
      }
      onDone();
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onEvent({ type: 'error', data: { text: err.message } });
      }
      onDone();
    });

  return controller;
}

// ── Agents ──────────────────────────────────────────

export async function listAgents(): Promise<
  { id: string; name: string; description: string; model_tier: string; tools: string[] }[]
> {
  return fetchAPI('/agents/');
}

// ── Usage ───────────────────────────────────────────

export interface UsageSummary {
  workspace_id: string;
  period_days: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  total_calls: number;
}

export async function getUsageSummary(workspaceId: string, days = 30): Promise<UsageSummary> {
  return fetchAPI(`/usage/${workspaceId}?days=${days}`);
}
