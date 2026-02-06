"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  Sparkles,
  Megaphone,
  Users,
  LayoutGrid,
  Settings,
  LogOut,
  Building2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";
import { useAuthStore } from "@/store/auth-store";

const navItems = [
  { href: "/", label: "QAi", icon: Sparkles },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/crm", label: "CRM", icon: Users },
  { href: "/apps", label: "Apps", icon: LayoutGrid },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { activeWorkspace } = useAuthStore();
  const { setWorkspaceSwitcherOpen } = useUIStore();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "h-screen flex flex-col bg-surface-0 border-r border-border",
        "transition-all duration-200",
        sidebarCollapsed ? "w-16" : "w-52"
      )}
    >
      {/* Top: Logo + Toggle */}
      <div className="flex items-center h-14 px-3 border-b border-border-subtle">
        {!sidebarCollapsed && (
          <span className="text-base font-bold text-text-primary ml-1 flex-1">
            QRev
          </span>
        )}
        <button
          onClick={toggleSidebar}
          className={cn(
            "p-1.5 rounded-md hover:bg-surface-3 text-text-muted",
            sidebarCollapsed && "mx-auto"
          )}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md transition-colors duration-150",
                sidebarCollapsed ? "justify-center p-2.5" : "px-3 py-2",
                active
                  ? "bg-accent/15 text-accent"
                  : "text-text-secondary hover:bg-surface-3 hover:text-text-primary"
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon className="w-4.5 h-4.5 shrink-0" />
              {!sidebarCollapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Workspace + Settings + Sign Out */}
      <div className="border-t border-border-subtle py-2 px-2 space-y-1">
        {/* Workspace Switcher */}
        <button
          onClick={() => setWorkspaceSwitcherOpen(true)}
          className={cn(
            "w-full flex items-center gap-3 rounded-md text-text-secondary hover:bg-surface-3 hover:text-text-primary transition-colors duration-150",
            sidebarCollapsed ? "justify-center p-2.5" : "px-3 py-2"
          )}
          title={
            sidebarCollapsed
              ? activeWorkspace?.name || "Workspace"
              : undefined
          }
        >
          <Building2 className="w-4.5 h-4.5 shrink-0" />
          {!sidebarCollapsed && (
            <span className="text-sm font-medium truncate">
              {activeWorkspace?.name || "Workspace"}
            </span>
          )}
        </button>

        {/* Settings */}
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-md transition-colors duration-150",
            sidebarCollapsed ? "justify-center p-2.5" : "px-3 py-2",
            pathname.startsWith("/settings")
              ? "bg-accent/15 text-accent"
              : "text-text-secondary hover:bg-surface-3 hover:text-text-primary"
          )}
          title={sidebarCollapsed ? "Settings" : undefined}
        >
          <Settings className="w-4.5 h-4.5 shrink-0" />
          {!sidebarCollapsed && (
            <span className="text-sm font-medium">Settings</span>
          )}
        </Link>

        {/* Sign Out */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn(
            "w-full flex items-center gap-3 rounded-md text-text-secondary hover:bg-surface-3 hover:text-status-error transition-colors duration-150",
            sidebarCollapsed ? "justify-center p-2.5" : "px-3 py-2"
          )}
          title={sidebarCollapsed ? "Sign Out" : undefined}
        >
          <LogOut className="w-4.5 h-4.5 shrink-0" />
          {!sidebarCollapsed && (
            <span className="text-sm font-medium">Sign Out</span>
          )}
        </button>
      </div>
    </aside>
  );
}
