"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Tab context ────────────────────────────────────

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("Tab components must be used within <Tabs>");
  return ctx;
}

// ─── Tabs root ──────────────────────────────────────

interface TabsProps {
  defaultTab: string;
  children: React.ReactNode;
  className?: string;
  onChange?: (tab: string) => void;
}

export function Tabs({ defaultTab, children, className, onChange }: TabsProps) {
  const [activeTab, setActive] = React.useState(defaultTab);

  const setActiveTab = React.useCallback(
    (tab: string) => {
      setActive(tab);
      onChange?.(tab);
    },
    [onChange]
  );

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

// ─── TabList ────────────────────────────────────────

interface TabListProps {
  children: React.ReactNode;
  className?: string;
}

export function TabList({ children, className }: TabListProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 border-b border-border-subtle px-1",
        className
      )}
      role="tablist"
    >
      {children}
    </div>
  );
}

// ─── Tab trigger ────────────────────────────────────

interface TabProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function Tab({ value, children, className }: TabProps) {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={() => setActiveTab(value)}
      className={cn(
        "px-4 py-2.5 text-sm font-medium transition-colors relative",
        isActive
          ? "text-accent"
          : "text-text-muted hover:text-text-secondary",
        // Underline indicator
        isActive &&
          "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-accent after:rounded-full",
        className
      )}
    >
      {children}
    </button>
  );
}

// ─── TabPanel ───────────────────────────────────────

interface TabPanelProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabPanel({ value, children, className }: TabPanelProps) {
  const { activeTab } = useTabsContext();

  if (activeTab !== value) return null;

  return (
    <div role="tabpanel" className={cn("animate-fade-in", className)}>
      {children}
    </div>
  );
}
