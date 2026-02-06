import { create } from "zustand";

interface UIStore {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Modals
  createWorkspaceOpen: boolean;
  setCreateWorkspaceOpen: (open: boolean) => void;
  workspaceSwitcherOpen: boolean;
  setWorkspaceSwitcherOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>()((set) => ({
  sidebarCollapsed: true,
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  createWorkspaceOpen: false,
  setCreateWorkspaceOpen: (open) => set({ createWorkspaceOpen: open }),
  workspaceSwitcherOpen: false,
  setWorkspaceSwitcherOpen: (open) => set({ workspaceSwitcherOpen: open }),
}));
