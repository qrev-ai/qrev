"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  generateTelegramLink,
  getTelegramLinks,
  revokeTelegramLink,
  type TelegramLink,
} from "@/lib/api-client";
import { Loader2, Copy, Check, Trash2, MessageCircle, ExternalLink } from "lucide-react";

export function TelegramSettings() {
  const { activeWorkspace } = useAuthStore();
  const workspaceId = activeWorkspace?.id;

  const [links, setLinks] = useState<TelegramLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadLinks = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const data = await getTelegramLinks(workspaceId);
      setLinks(data);
    } catch (err) {
      console.error("Failed to load Telegram links:", err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  const handleGenerate = async () => {
    if (!workspaceId) return;
    setGenerating(true);
    try {
      const result = await generateTelegramLink(workspaceId);
      setGeneratedUrl(result.bot_url);
      await loadLinks();
    } catch (err) {
      console.error("Failed to generate link:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedUrl) return;
    await navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async (linkId: string) => {
    try {
      await revokeTelegramLink(linkId);
      await loadLinks();
    } catch (err) {
      console.error("Failed to revoke link:", err);
    }
  };

  const connectedLinks = links.filter((l) => l.telegram_user_id && l.telegram_user_id > 0);
  const pendingLinks = links.filter((l) => !l.telegram_user_id || l.telegram_user_id === 0);

  return (
    <section>
      <div className="mb-4">
        <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          Telegram Bot
        </h3>
        <p className="text-xs text-text-muted mt-1">
          Chat with QAi agents directly from Telegram. Research companies, write emails,
          and manage campaigns on the go.
        </p>
      </div>

      {/* Setup Instructions */}
      <div className="rounded-lg border border-border bg-surface-2 p-4 mb-4">
        <h4 className="text-sm font-medium text-text-primary mb-2">How to connect</h4>
        <ol className="text-xs text-text-muted space-y-1.5 list-decimal list-inside">
          <li>Click <strong className="text-text-secondary">Generate Link</strong> below to create a one-time connection URL</li>
          <li>Open the link in Telegram (or send the token to the bot with <code className="px-1 py-0.5 bg-surface-3 rounded text-text-secondary">/start</code>)</li>
          <li>Start chatting — your conversations sync to this dashboard automatically</li>
        </ol>
      </div>

      {/* Generate Link */}
      <div className="flex items-center gap-3 mb-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleGenerate}
          isLoading={generating}
          leftIcon={<MessageCircle className="h-3 w-3" />}
        >
          Generate Link
        </Button>
      </div>

      {/* Generated URL */}
      {generatedUrl && (
        <div className="rounded-lg border border-accent/30 bg-surface-2 p-3 mb-4">
          <p className="text-xs text-text-muted mb-2">
            Send this link to the person who should connect:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs px-3 py-2 rounded bg-surface-3 text-text-primary border border-border-subtle break-all">
              {generatedUrl}
            </code>
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              {copied ? <Check className="h-3.5 w-3.5 text-status-success" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <a
              href={generatedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Connected Users */}
      {loading ? (
        <div className="flex items-center gap-2 text-text-muted py-4 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      ) : (
        <div className="space-y-2">
          {connectedLinks.map((link) => (
            <div
              key={link.id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-surface-3 border border-border-subtle flex items-center justify-center">
                  <MessageCircle className="h-4 w-4 text-text-secondary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {link.telegram_username ? `@${link.telegram_username}` : `User ${link.telegram_user_id}`}
                  </p>
                  <p className="text-xs text-text-muted">
                    {link.conversation_id ? "Conversation synced" : "Connected"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success" size="sm">Connected</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRevoke(link.id)}
                  className="text-text-muted hover:text-status-error"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}

          {pendingLinks.length > 0 && (
            <p className="text-xs text-text-muted pt-2">
              {pendingLinks.length} pending link{pendingLinks.length > 1 ? "s" : ""} (waiting for user to connect)
            </p>
          )}

          {connectedLinks.length === 0 && pendingLinks.length === 0 && (
            <p className="text-xs text-text-muted text-center py-4">
              No Telegram users connected yet. Generate a link above to get started.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
