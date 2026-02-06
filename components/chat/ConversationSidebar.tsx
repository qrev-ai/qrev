"use client";

import { useState } from "react";
import { Plus, MessageSquare, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: ConversationSidebarProps) {
  return (
    <div className="w-64 h-full border-r border-border-subtle flex flex-col bg-surface-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <span className="text-sm font-semibold text-text-primary">Chats</span>
        <button
          onClick={onNew}
          className="p-1.5 rounded-md hover:bg-surface-3 text-text-muted hover:text-text-primary transition-colors"
          title="New Chat"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-1">
        {conversations.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <MessageSquare className="w-8 h-8 text-text-muted mx-auto mb-2" />
            <p className="text-xs text-text-muted">No conversations yet</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                "w-full text-left px-4 py-2.5 flex items-center gap-2 group transition-colors",
                conv.id === activeId
                  ? "bg-accent/10 text-accent"
                  : "text-text-secondary hover:bg-surface-2"
              )}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{conv.title}</p>
                <p className="text-xs text-text-muted">
                  {formatDistanceToNow(new Date(conv.updatedAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conv.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface-4 text-text-muted hover:text-status-error transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
