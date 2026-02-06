import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Workspace {
  id: string;
  name: string;
}

interface AuthStore {
  activeWorkspaceId: string | null;
  activeWorkspace: Workspace | null;
  workspaces: Workspace[];
  setActiveWorkspace: (workspace: Workspace) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  addWorkspace: (workspace: Workspace) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      activeWorkspaceId: null,
      activeWorkspace: null,
      workspaces: [],
      setActiveWorkspace: (workspace) =>
        set({ activeWorkspace: workspace, activeWorkspaceId: workspace.id }),
      setWorkspaces: (workspaces) => set({ workspaces }),
      addWorkspace: (workspace) =>
        set((state) => ({
          workspaces: [...state.workspaces, workspace],
        })),
      clear: () =>
        set({
          activeWorkspaceId: null,
          activeWorkspace: null,
          workspaces: [],
        }),
    }),
    {
      name: "qrev-auth",
    }
  )
);
