"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import {
  getAvailableProviders,
  getConnectedProviders,
  connectProvider,
  validateProvider,
  disconnectProvider,
  type AvailableProvider,
  type ConnectedProvider,
  type CredentialField,
} from "@/lib/api-client";
import { Key, Trash2, CheckCircle, XCircle, Loader2, Mail } from "lucide-react";

const PROVIDER_DESCRIPTIONS: Record<string, string> = {
  sendgrid: "Transactional & marketing email",
  resend: "Developer-first email API",
  mailgun: "Email API with analytics",
  ses: "AWS cloud email service",
  postmark: "Fast transactional email",
  gmail: "Send from your Gmail account",
};

export function ProvidersSettings() {
  const { activeWorkspace } = useAuthStore();
  const [available, setAvailable] = useState<AvailableProvider[]>([]);
  const [connected, setConnected] = useState<ConnectedProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  // Single-field fallback for LLM providers
  const [apiKeyInput, setApiKeyInput] = useState("");
  // Multi-field state for email providers
  const [credFields, setCredFields] = useState<Record<string, string>>({});
  const [validating, setValidating] = useState<string | null>(null);

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

  const resetConnectState = () => {
    setConnectingId(null);
    setApiKeyInput("");
    setCredFields({});
  };

  const handleConnectLLM = async (provider: AvailableProvider) => {
    if (!workspaceId || !apiKeyInput.trim()) return;
    setConnectingId(provider.id + "_saving");
    try {
      await connectProvider({
        workspace_id: workspaceId,
        provider_type: provider.type,
        provider_id: provider.id,
        credentials: { api_key: apiKeyInput.trim() },
      });
      resetConnectState();
      await loadData();
    } catch (err) {
      console.error("Failed to connect:", err);
      setConnectingId(provider.id);
    }
  };

  const handleConnectEmail = async (provider: AvailableProvider) => {
    if (!workspaceId) return;
    const fields = provider.credential_fields || [];
    const requiredMissing = fields
      .filter((f) => f.required)
      .some((f) => !credFields[f.key]?.trim());
    if (requiredMissing) return;

    setConnectingId(provider.id + "_saving");
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
      resetConnectState();
      await loadData();
    } catch (err) {
      console.error("Failed to connect:", err);
      setConnectingId(provider.id);
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
      <div className="flex items-center gap-2 text-text-muted py-8">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading providers...
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* LLM Providers */}
      <section>
        <h3 className="text-sm font-semibold text-text-primary mb-3">
          LLM Providers
        </h3>
        <p className="text-xs text-text-muted mb-4">
          Connect your API keys to use different AI models. Agents will automatically route to the best model based on task complexity and cost.
        </p>
        <div className="space-y-3">
          {available
            .filter((p) => p.type === "llm")
            .map((provider) => {
              const conn = connected.find((c) => c.provider_id === provider.id);
              const isConnected = !!conn;

              return (
                <Card key={provider.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-surface-3 flex items-center justify-center">
                          <Key className="h-4 w-4 text-text-muted" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {provider.name}
                          </p>
                          <p className="text-xs text-text-muted">
                            {provider.models?.length || 0} models available
                          </p>
                        </div>
                      </div>

                      {isConnected ? (
                        <div className="flex items-center gap-2">
                          <Badge variant={conn.is_valid ? "success" : "error"} size="sm">
                            {conn.is_valid ? (
                              <><CheckCircle className="h-3 w-3 mr-1" /> Connected</>
                            ) : (
                              <><XCircle className="h-3 w-3 mr-1" /> Invalid</>
                            )}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleValidate(conn.id)}
                            isLoading={validating === conn.id}
                          >
                            Test
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDisconnect(conn.id)}
                            leftIcon={<Trash2 className="h-3 w-3" />}
                          >
                            Remove
                          </Button>
                        </div>
                      ) : connectingId === provider.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="password"
                            placeholder="sk-... or API key"
                            value={apiKeyInput}
                            onChange={(e) => setApiKeyInput(e.target.value)}
                            className="w-64 h-8 text-xs"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleConnectLLM(provider)}
                            disabled={!apiKeyInput.trim()}
                          >
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={resetConnectState}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            resetConnectState();
                            setConnectingId(provider.id);
                          }}
                        >
                          Connect
                        </Button>
                      )}
                    </div>

                    {/* Model list for connected providers */}
                    {isConnected && provider.models && (
                      <div className="mt-3 pt-3 border-t border-border-subtle">
                        <div className="flex flex-wrap gap-1.5">
                          {provider.models.map((m) => (
                            <Badge key={m.id} variant="outline" size="sm">
                              {m.name}
                              <span className="ml-1 text-text-muted">
                                ${m.input_cost_per_1m}/{m.output_cost_per_1m}
                              </span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </section>

      {/* Email Providers */}
      <section>
        <h3 className="text-sm font-semibold text-text-primary mb-3">
          Email Providers
        </h3>
        <p className="text-xs text-text-muted mb-4">
          Connect an email sending service to deliver campaign emails. You can connect multiple providers.
        </p>
        <div className="space-y-3">
          {available
            .filter((p) => p.type === "email")
            .map((provider) => {
              const conn = connected.find((c) => c.provider_id === provider.id);
              const isConnected = !!conn;
              const fields = provider.credential_fields || [
                { key: "api_key", label: "API Key", type: "password" as const, placeholder: "API key", required: true },
              ];
              const isSaving = connectingId === provider.id + "_saving";
              const isEditing = connectingId === provider.id;
              const requiredFilled = fields
                .filter((f) => f.required)
                .every((f) => credFields[f.key]?.trim());

              return (
                <Card key={provider.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-surface-3 flex items-center justify-center">
                          <Mail className="h-4 w-4 text-text-muted" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {provider.name}
                          </p>
                          <p className="text-xs text-text-muted">
                            {PROVIDER_DESCRIPTIONS[provider.id] || "Email provider"}
                          </p>
                        </div>
                      </div>

                      {isConnected ? (
                        <div className="flex items-center gap-2">
                          <Badge variant={conn.is_valid ? "success" : "error"} size="sm">
                            {conn.is_valid ? (
                              <><CheckCircle className="h-3 w-3 mr-1" /> Connected</>
                            ) : (
                              <><XCircle className="h-3 w-3 mr-1" /> Invalid</>
                            )}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleValidate(conn.id)}
                            isLoading={validating === conn.id}
                          >
                            Test
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDisconnect(conn.id)}
                            leftIcon={<Trash2 className="h-3 w-3" />}
                          >
                            Remove
                          </Button>
                        </div>
                      ) : !isEditing ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            resetConnectState();
                            setConnectingId(provider.id);
                          }}
                        >
                          Connect
                        </Button>
                      ) : null}
                    </div>

                    {/* Credential input fields */}
                    {isEditing && (
                      <div className="mt-3 pt-3 border-t border-border-subtle space-y-2">
                        {fields.map((field) => (
                          <div key={field.key}>
                            <label className="text-xs text-text-muted mb-1 block">
                              {field.label}{field.required ? " *" : ""}
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
                              className="h-8 text-xs"
                            />
                          </div>
                        ))}
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            onClick={() => handleConnectEmail(provider)}
                            disabled={!requiredFilled}
                            isLoading={isSaving}
                          >
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={resetConnectState}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </section>
    </div>
  );
}
