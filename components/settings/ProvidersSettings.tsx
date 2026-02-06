"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  getAvailableProviders,
  getConnectedProviders,
  connectProvider,
  validateProvider,
  disconnectProvider,
  type AvailableProvider,
  type ConnectedProvider,
} from "@/lib/api-client";
import { Trash2, CheckCircle, XCircle, Loader2, KeyRound, X } from "lucide-react";
import { PROVIDER_LOGO_MAP } from "./ProviderLogos";

const PROVIDER_DESCRIPTIONS: Record<string, string> = {
  // LLM
  openai: "GPT-4o, GPT-4o Mini, o3-mini",
  anthropic: "Claude Opus, Sonnet, Haiku",
  google: "Gemini 2.0 Flash, Gemini 2.5 Pro",
  // Email
  sendgrid: "Transactional & marketing email",
  resend: "Developer-first email API",
  mailgun: "Email API with powerful analytics",
  ses: "AWS cloud email at scale",
  postmark: "Fast transactional delivery",
  gmail: "Send from your Google account",
};

export function ProvidersSettings() {
  const { activeWorkspace } = useAuthStore();
  const [available, setAvailable] = useState<AvailableProvider[]>([]);
  const [connected, setConnected] = useState<ConnectedProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [credFields, setCredFields] = useState<Record<string, string>>({});
  const [validating, setValidating] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const workspaceId = activeWorkspace?.id;

  const loadData = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const [avail, conn] = await Promise.all([
        getAvailableProviders(),
        getConnectedProviders(workspaceId),
      ]);
      setAvailable(avail);
      setConnected(conn);
    } catch (err) {
      console.error("Failed to load providers:", err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setConnectingId(null);
    setApiKeyInput("");
    setCredFields({});
    setSaving(false);
  };

  const handleConnectLLM = async (provider: AvailableProvider) => {
    if (!workspaceId || !apiKeyInput.trim()) return;
    setSaving(true);
    try {
      await connectProvider({
        workspace_id: workspaceId,
        provider_type: provider.type,
        provider_id: provider.id,
        credentials: { api_key: apiKeyInput.trim() },
      });
      resetForm();
      await loadData();
    } catch (err) {
      console.error("Failed to connect:", err);
      setSaving(false);
    }
  };

  const handleConnectEmail = async (provider: AvailableProvider) => {
    if (!workspaceId) return;
    const fields = provider.credential_fields || [];
    const requiredMissing = fields
      .filter((f) => f.required)
      .some((f) => !credFields[f.key]?.trim());
    if (requiredMissing) return;

    setSaving(true);
    try {
      const creds: Record<string, string> = {};
      for (const f of fields) {
        if (credFields[f.key]?.trim()) {
          creds[f.key] = credFields[f.key].trim();
        }
      }
      await connectProvider({
        workspace_id: workspaceId,
        provider_type: provider.type,
        provider_id: provider.id,
        credentials: creds,
      });
      resetForm();
      await loadData();
    } catch (err) {
      console.error("Failed to connect:", err);
      setSaving(false);
    }
  };

  const handleValidate = async (credId: string) => {
    setValidating(credId);
    try {
      await validateProvider(credId);
      await loadData();
    } catch (err) {
      console.error("Validation failed:", err);
    } finally {
      setValidating(null);
    }
  };

  const handleDisconnect = async (credId: string) => {
    try {
      await disconnectProvider(credId);
      await loadData();
    } catch (err) {
      console.error("Failed to disconnect:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-text-muted py-12 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading integrations...</span>
      </div>
    );
  }

  const llmProviders = available.filter((p) => p.type === "llm");
  const emailProviders = available.filter((p) => p.type === "email");

  return (
    <div className="max-w-3xl space-y-10">
      {/* ── LLM Providers ────────────────────────────── */}
      <section>
        <div className="mb-4">
          <h3 className="text-base font-semibold text-text-primary">
            LLM Providers
          </h3>
          <p className="text-xs text-text-muted mt-1">
            Bring your own API keys. Agents auto-route to the cheapest model per task.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {llmProviders.map((provider) => {
            const conn = connected.find((c) => c.provider_id === provider.id);
            const isConnected = !!conn;
            const isEditing = connectingId === provider.id;
            const LogoComponent = PROVIDER_LOGO_MAP[provider.id];

            return (
              <div
                key={provider.id}
                className={`
                  rounded-lg border transition-all duration-150
                  ${isConnected
                    ? "bg-surface-2 border-status-success/20"
                    : "bg-surface-2 border-border hover:border-border-strong"
                  }
                `}
              >
                <div className="px-4 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-lg bg-surface-3 border border-border-subtle flex items-center justify-center text-text-secondary">
                      {LogoComponent ? <LogoComponent className="h-5 w-5" /> : <KeyRound className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary">
                          {provider.name}
                        </span>
                        {isConnected && (
                          <Badge variant="success" size="sm">
                            <CheckCircle className="h-2.5 w-2.5 mr-1" />
                            Connected
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        {PROVIDER_DESCRIPTIONS[provider.id] || `${provider.models?.length || 0} models`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isConnected ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleValidate(conn.id)}
                          isLoading={validating === conn.id}
                        >
                          Test
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDisconnect(conn.id)}
                          leftIcon={<Trash2 className="h-3 w-3" />}
                          className="text-text-muted hover:text-status-error"
                        >
                          Remove
                        </Button>
                      </>
                    ) : isEditing ? null : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          resetForm();
                          setConnectingId(provider.id);
                        }}
                        leftIcon={<KeyRound className="h-3 w-3" />}
                      >
                        BYO Key
                      </Button>
                    )}
                  </div>
                </div>

                {/* Inline API key form */}
                {isEditing && (
                  <div className="px-4 pb-3.5 pt-0">
                    <div className="flex items-center gap-2">
                      <Input
                        type="password"
                        placeholder="Paste your API key..."
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        className="flex-1 h-8 text-xs bg-surface-3"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && apiKeyInput.trim()) handleConnectLLM(provider);
                          if (e.key === "Escape") resetForm();
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleConnectLLM(provider)}
                        disabled={!apiKeyInput.trim()}
                        isLoading={saving}
                      >
                        Save
                      </Button>
                      <button
                        onClick={resetForm}
                        className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Model badges for connected providers */}
                {isConnected && provider.models && provider.models.length > 0 && (
                  <div className="px-4 pb-3 pt-0">
                    <div className="flex flex-wrap gap-1.5">
                      {provider.models.map((m) => (
                        <span
                          key={m.id}
                          className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-surface-3 text-text-muted border border-border-subtle"
                        >
                          {m.name}
                          <span className="ml-1 opacity-60">
                            ${m.input_cost_per_1m}/${m.output_cost_per_1m}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Email Providers ──────────────────────────── */}
      <section>
        <div className="mb-4">
          <h3 className="text-base font-semibold text-text-primary">
            Email Providers
          </h3>
          <p className="text-xs text-text-muted mt-1">
            Connect your email service to send campaign emails. You can connect multiple providers.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {emailProviders.map((provider) => {
            const conn = connected.find((c) => c.provider_id === provider.id);
            const isConnected = !!conn;
            const isEditing = connectingId === provider.id;
            const LogoComponent = PROVIDER_LOGO_MAP[provider.id];
            const fields = provider.credential_fields || [
              { key: "api_key", label: "API Key", type: "password" as const, placeholder: "API key", required: true },
            ];
            const requiredFilled = fields
              .filter((f) => f.required)
              .every((f) => credFields[f.key]?.trim());

            return (
              <div
                key={provider.id}
                className={`
                  rounded-lg border transition-all duration-150
                  ${isConnected
                    ? "bg-surface-2 border-status-success/20"
                    : isEditing
                      ? "bg-surface-2 border-accent/30"
                      : "bg-surface-2 border-border hover:border-border-strong"
                  }
                `}
              >
                {/* Header */}
                <div className="px-4 py-3.5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-surface-3 border border-border-subtle flex items-center justify-center text-text-secondary shrink-0">
                        {LogoComponent ? <LogoComponent className="h-5 w-5" /> : <KeyRound className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-text-primary">
                            {provider.name}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">
                          {PROVIDER_DESCRIPTIONS[provider.id] || "Email provider"}
                        </p>
                      </div>
                    </div>

                    {isConnected && (
                      <Badge variant="success" size="sm">
                        <CheckCircle className="h-2.5 w-2.5 mr-1" />
                        Live
                      </Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-3">
                    {isConnected ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleValidate(conn.id)}
                          isLoading={validating === conn.id}
                          className="flex-1"
                        >
                          Test Connection
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDisconnect(conn.id)}
                          className="text-text-muted hover:text-status-error"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : !isEditing ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          resetForm();
                          setConnectingId(provider.id);
                        }}
                        leftIcon={<KeyRound className="h-3 w-3" />}
                      >
                        BYO Key
                      </Button>
                    ) : null}
                  </div>
                </div>

                {/* Credential form */}
                {isEditing && (
                  <div className="px-4 pb-4 space-y-2.5 border-t border-border-subtle pt-3">
                    {fields.map((field) => (
                      <div key={field.key}>
                        <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1 block">
                          {field.label}
                          {field.required && <span className="text-status-error ml-0.5">*</span>}
                        </label>
                        <Input
                          type={field.type === "text" ? "text" : "password"}
                          placeholder={field.placeholder}
                          value={credFields[field.key] || ""}
                          onChange={(e) =>
                            setCredFields((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                          className="h-8 text-xs bg-surface-3"
                          onKeyDown={(e) => {
                            if (e.key === "Escape") resetForm();
                          }}
                        />
                      </div>
                    ))}
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleConnectEmail(provider)}
                        disabled={!requiredFilled}
                        isLoading={saving}
                      >
                        Connect
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetForm}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
