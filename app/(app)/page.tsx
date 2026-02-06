"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles } from "lucide-react";
import { ConversationSidebar } from "@/components/chat/ConversationSidebar";
import { ChatMessages, ChatMessage } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";
import { useAuthStore } from "@/store/auth-store";

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

const suggestions = [
  "Create a campaign for fintech CTOs",
  "Research prospects from my CSV",
  "Help me write a cold email",
  "Analyze my campaign performance",
];

export default function QAiPage() {
  const { activeWorkspaceId } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!activeWorkspaceId) return;
    try {
      const res = await fetch(
        `/api/conversations?workspaceId=${activeWorkspaceId}`
      );
      if (res.ok) {
        setConversations(await res.json());
      }
    } catch {}
  }, [activeWorkspaceId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Load conversation messages
  const loadConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(
          data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            metadata: m.metadata,
          }))
        );
        setActiveConversationId(id);
      }
    } catch {}
  }, []);

  // Create new conversation
  const createConversation = useCallback(async () => {
    if (!activeWorkspaceId) return null;
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: activeWorkspaceId }),
      });
      if (res.ok) {
        const conv = await res.json();
        setConversations((prev) => [conv, ...prev]);
        setActiveConversationId(conv.id);
        setMessages([]);
        return conv.id;
      }
    } catch {}
    return null;
  }, [activeWorkspaceId]);

  // Delete conversation
  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/conversations/${id}`, { method: "DELETE" });
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConversationId === id) {
          setActiveConversationId(null);
          setMessages([]);
        }
      } catch {}
    },
    [activeConversationId]
  );

  // Send message
  const handleSend = useCallback(
    async (content: string, csvData?: any[]) => {
      let convId = activeConversationId;

      // Create conversation if needed
      if (!convId) {
        convId = await createConversation();
        if (!convId) return;
      }

      // Add user message optimistically
      const userMsg: ChatMessage = {
        id: "temp-" + Date.now(),
        role: "user",
        content,
        metadata: csvData
          ? { type: "csv_data" as const, data: csvData.slice(0, 50) }
          : undefined,
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);

      try {
        const res = await fetch(`/api/conversations/${convId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, csvData }),
        });

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";
        const assistantId = "assistant-" + Date.now();

        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: "assistant", content: "" },
        ]);

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;

          assistantContent += decoder.decode(value);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: assistantContent } : m
            )
          );
        }

        // Check for email draft metadata
        const emailMatch = assistantContent.match(
          /```email\s*\n?([\s\S]*?)\n?```/
        );
        if (emailMatch) {
          try {
            const emailData = JSON.parse(emailMatch[1]);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content: assistantContent.replace(
                        /```email\s*\n?[\s\S]*?\n?```/,
                        ""
                      ),
                      metadata: { type: "email_draft" as const, data: emailData },
                    }
                  : m
              )
            );
          } catch {}
        }

        // Refresh conversation list to update title
        fetchConversations();
      } catch (err) {
        console.error("Chat error:", err);
      } finally {
        setIsStreaming(false);
      }
    },
    [activeConversationId, createConversation, fetchConversations]
  );

  // Handle suggestion click
  const handleSuggestion = (suggestion: string) => {
    handleSend(suggestion);
  };

  return (
    <div className="flex h-full">
      {/* Conversation sidebar */}
      <ConversationSidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={loadConversation}
        onNew={() => {
          setActiveConversationId(null);
          setMessages([]);
        }}
        onDelete={deleteConversation}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {messages.length === 0 && !activeConversationId ? (
          /* Welcome screen */
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              Welcome to QAi
            </h2>
            <p className="text-text-secondary mb-6 max-w-md text-center">
              Your AI assistant for GTM. Create campaigns, research prospects,
              and generate personalized outreach.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestion(s)}
                  className="px-4 py-2 rounded-lg bg-surface-2 hover:bg-surface-3 text-text-secondary text-sm transition-colors border border-border-subtle"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Chat messages */
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <ChatMessages messages={messages} isStreaming={isStreaming} />
          </div>
        )}

        {/* Chat input */}
        <ChatInput onSend={handleSend} disabled={isStreaming} />
      </div>
    </div>
  );
}
