"use client";

import { useState, useEffect } from "react";
import { Tabs, TabList, Tab, TabPanel } from "@/components/ui";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { UsersTeamsList } from "@/components/settings/UsersTeamsList";
import { ProvidersSettings } from "@/components/settings/ProvidersSettings";
import { useAuthStore } from "@/store/auth-store";

// Placeholder user — replaced by real session data when auth is connected
const mockUser = {
  name: "Dev User",
  email: "dev@qrev.ai",
  image: null,
};

const mockMembers = [
  { id: "1", name: "Dev User", email: "dev@qrev.ai", image: null, role: "ADMIN" },
];

export default function SettingsPage() {
  const { activeWorkspace } = useAuthStore();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-subtle">
        <h1 className="text-lg font-semibold text-text-primary">Settings</h1>
        {activeWorkspace && (
          <p className="text-sm text-text-muted mt-0.5">
            {activeWorkspace.name}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <Tabs defaultTab="integrations">
          <TabList>
            <Tab value="integrations">Integrations</Tab>
            <Tab value="profile">My Profile</Tab>
            <Tab value="account">Account</Tab>
            <Tab value="team">Users & Teams</Tab>
          </TabList>

          <TabPanel value="integrations" className="mt-6">
            <ProvidersSettings />
          </TabPanel>

          <TabPanel value="profile" className="mt-6">
            <ProfileForm user={mockUser} />
          </TabPanel>

          <TabPanel value="account" className="mt-6">
            <div className="max-w-lg space-y-4">
              <h3 className="text-sm font-semibold text-text-primary">
                Workspace
              </h3>
              <div className="p-4 bg-surface-2 border border-border-subtle rounded-lg">
                <p className="text-sm text-text-primary font-medium">
                  {activeWorkspace?.name || "No workspace"}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  Workspace ID: {activeWorkspace?.id || "-"}
                </p>
              </div>
            </div>
          </TabPanel>

          <TabPanel value="team" className="mt-6">
            <UsersTeamsList members={mockMembers} />
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
}
