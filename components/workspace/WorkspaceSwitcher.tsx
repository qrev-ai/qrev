"use client";

import { X, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";
import { useAuthStore } from "@/store/auth-store";

export function WorkspaceSwitcher() {
  const { workspaceSwitcherOpen, setWorkspaceSwitcherOpen, setCreateWorkspaceOpen } =
    useUIStore();
  const { workspaces, activeWorkspaceId, setActiveWorkspace } = useAuthStore();

  if (!workspaceSwitcherOpen) return null;

  const handleSelect = (workspace: { id: string; name: string }) => {
    setActiveWorkspace(workspace);
    setWorkspaceSwitcherOpen(false);
  };

  const handleCreateNew = () => {
    setWorkspaceSwitcherOpen(false);
    setCreateWorkspaceOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => setWorkspaceSwitcherOpen(false)}
      />
      <div className="relative z-10 w-full max-w-sm bg-surface-2 border border-border rounded-xl shadow-lg animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <h2 className="text-base font-semibold text-text-primary">
            Switch Workspace
          </h2>
          <button
            onClick={() => setWorkspaceSwitcherOpen(false)}
            className="p-1 rounded-md hover:bg-surface-4 text-text-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-2">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => handleSelect(ws)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
                ws.id === activeWorkspaceId
                  ? "bg-accent/15 text-accent"
                  : "text-text-primary hover:bg-surface-3"
              )}
            >
              <div className="w-8 h-8 rounded-md bg-surface-4 flex items-center justify-center text-sm font-semibold shrink-0">
                {ws.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium flex-1 truncate">
                {ws.name}
              </span>
              {ws.id === activeWorkspaceId && (
                <Check className="w-4 h-4 shrink-0" />
              )}
            </button>
          ))}

          <button
            onClick={handleCreateNew}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-text-secondary hover:bg-surface-3 hover:text-text-primary transition-colors mt-1"
          >
            <div className="w-8 h-8 rounded-md border border-dashed border-border-strong flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium">Create new workspace</span>
          </button>
        </div>
      </div>
    </div>
  );
}
