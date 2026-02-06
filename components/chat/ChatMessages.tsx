"use client";

import { useEffect, useRef } from "react";
import { Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { EmailDraftCard } from "./EmailDraftCard";
import { CsvPreview } from "./CsvPreview";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  metadata?: {
    type?: "email_draft" | "csv_data" | "table";
    data?: any;
  } | null;
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  isStreaming: boolean;
}

export function ChatMessages({ messages, isStreaming }: ChatMessagesProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-4">
      {messages.map((msg) => (
        <div key={msg.id} className="flex gap-3 animate-fade-in">
          {/* Avatar */}
          <div
            className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
              msg.role === "assistant"
                ? "bg-accent/20"
                : "bg-surface-4"
            )}
          >
            {msg.role === "assistant" ? (
              <Sparkles className="w-3.5 h-3.5 text-accent" />
            ) : (
              <User className="w-3.5 h-3.5 text-text-secondary" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-text-muted mb-1">
              {msg.role === "assistant" ? "QAi" : "You"}
            </p>

            {/* Structured content based on metadata */}
            {msg.metadata?.type === "email_draft" && msg.metadata.data ? (
              <EmailDraftCard
                subject={msg.metadata.data.subject}
                body={msg.metadata.data.body}
                to={msg.metadata.data.to}
              />
            ) : msg.metadata?.type === "csv_data" && msg.metadata.data ? (
              <CsvPreview data={msg.metadata.data} />
            ) : (
              <div className="text-sm text-text-primary prose prose-invert prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Streaming indicator */}
      {isStreaming && messages[messages.length - 1]?.role === "user" && (
        <div className="flex gap-3">
          <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
          </div>
          <div className="flex gap-1 pt-2">
            <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" />
            <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce [animation-delay:0.1s]" />
            <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce [animation-delay:0.2s]" />
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
