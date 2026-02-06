"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";
import { useAuthStore } from "@/store/auth-store";

export function CreateWorkspaceModal() {
  const { createWorkspaceOpen, setCreateWorkspaceOpen } = useUIStore();
  const { addWorkspace, setActiveWorkspace, workspaces } = useAuthStore();
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isFirstWorkspace = workspaces.length === 0;

  if (!createWorkspaceOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Workspace name is required");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), domain: domain.trim() || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create workspace");
      }

      const workspace = await res.json();
      addWorkspace(workspace);
      setActiveWorkspace(workspace);
      setName("");
      setDomain("");
      setCreateWorkspaceOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={isFirstWorkspace ? undefined : () => setCreateWorkspaceOpen(false)}
      />
      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-surface-2 border border-border rounded-xl shadow-lg animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <h2 className="text-base font-semibold text-text-primary">
            {isFirstWorkspace ? "Create your first workspace" : "Create Workspace"}
          </h2>
          {!isFirstWorkspace && (
            <button
              onClick={() => setCreateWorkspaceOpen(false)}
              className="p-1 rounded-md hover:bg-surface-4 text-text-muted"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isFirstWorkspace && (
            <p className="text-sm text-text-secondary">
              Workspaces let you organize your team&apos;s campaigns, prospects,
              and settings in one place.
            </p>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">
              Workspace Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Corp"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">
              Domain{" "}
              <span className="text-text-muted font-normal">(optional)</span>
            </label>
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g. acme.com"
            />
          </div>

          {error && <p className="text-sm text-status-error">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            {!isFirstWorkspace && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCreateWorkspaceOpen(false)}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" isLoading={isSubmitting}>
              Create Workspace
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
