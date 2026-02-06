"use client";

import { useState } from "react";
import { Copy, Check, Pencil, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailDraftCardProps {
  subject: string;
  body: string;
  to?: string;
}

export function EmailDraftCard({ subject, body, to }: EmailDraftCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-surface-2 border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border-subtle bg-surface-3/50">
        <Mail className="w-3.5 h-3.5 text-accent" />
        <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
          Email Draft
        </span>
      </div>

      {/* Email content */}
      <div className="p-4 space-y-3">
        {to && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-text-muted">To:</span>
            <span className="text-text-primary">{to}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-text-muted">Subject:</span>
          <span className="text-text-primary font-medium">{subject}</span>
        </div>
        <div className="border-t border-border-subtle pt-3">
          <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
            {body}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border-subtle">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-surface-3 hover:bg-surface-4 text-text-secondary transition-colors"
        >
          {copied ? (
            <Check className="w-3 h-3 text-status-success" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
