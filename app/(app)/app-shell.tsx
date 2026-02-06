"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuthStore } from "@/store/auth-store";
import { useUIStore } from "@/store/ui-store";
import { CreateWorkspaceModal } from "@/components/workspace/CreateWorkspaceModal";
import { WorkspaceSwitcher } from "@/components/workspace/WorkspaceSwitcher";

interface AppShellProps {
  children: React.ReactNode;
  workspaces: { id: string; name: string }[];
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

export function AppShell({ children, workspaces, user }: AppShellProps) {
  const { setWorkspaces, setActiveWorkspace, activeWorkspaceId } =
    useAuthStore();
  const { setCreateWorkspaceOpen } = useUIStore();

  useEffect(() => {
    setWorkspaces(workspaces);

    if (workspaces.length === 0) {
      // First login — prompt to create workspace
      setCreateWorkspaceOpen(true);
    } else if (
      !activeWorkspaceId ||
      !workspaces.find((w) => w.id === activeWorkspaceId)
    ) {
      // Auto-select first workspace if none selected or invalid
      setActiveWorkspace(workspaces[0]);
    }
  }, [
    workspaces,
    activeWorkspaceId,
    setWorkspaces,
    setActiveWorkspace,
    setCreateWorkspaceOpen,
  ]);

  return (
    <SessionProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
      <CreateWorkspaceModal />
      <WorkspaceSwitcher />
    </SessionProvider>
  );
}
