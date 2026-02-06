"use client";

import { useState } from "react";
import { SearchInput } from "@/components/ui";
import { AppCard } from "@/components/apps/AppCard";
import { IntegrationCard } from "@/components/apps/IntegrationCard";
import { Megaphone, Users, MessageSquare, BarChart3, Mail, Globe } from "lucide-react";
import toast from "react-hot-toast";

const apps = [
  {
    name: "Campaigns",
    description: "Create and manage multi-step email sequences with AI personalization.",
    icon: Megaphone,
    installed: true,
  },
  {
    name: "CRM",
    description: "Manage prospects, companies, and your sales pipeline.",
    icon: Users,
    installed: true,
  },
  {
    name: "QAi Chat",
    description: "AI assistant for GTM — research prospects, generate emails, and more.",
    icon: MessageSquare,
    installed: true,
  },
  {
    name: "Analytics",
    description: "Track campaign performance, open rates, and reply metrics.",
    icon: BarChart3,
    installed: false,
  },
];

const integrations = [
  {
    name: "HubSpot",
    description: "Sync contacts and deals with your HubSpot CRM.",
    logo: "🟠",
    connected: false,
  },
  {
    name: "Zoom",
    description: "Schedule meetings directly from campaigns.",
    logo: "🔵",
    connected: false,
  },
  {
    name: "Gmail",
    description: "Send emails through your Gmail account.",
    logo: "📧",
    connected: false,
  },
  {
    name: "Slack",
    description: "Get real-time notifications for replies and opens.",
    logo: "💬",
    connected: false,
  },
];

export default function AppsPage() {
  const [search, setSearch] = useState("");

  const filteredApps = apps.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredIntegrations = integrations.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
        <h1 className="text-lg font-semibold text-text-primary">Apps</h1>
        <div className="w-64">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search apps..."
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-6 space-y-8">
        {/* Apps grid */}
        <section>
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
            Apps
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredApps.map((app) => (
              <AppCard
                key={app.name}
                name={app.name}
                description={app.description}
                icon={app.icon}
                installed={app.installed}
              />
            ))}
          </div>
        </section>

        {/* Integrations */}
        <section>
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
            Integrations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredIntegrations.map((integration) => (
              <IntegrationCard
                key={integration.name}
                name={integration.name}
                description={integration.description}
                logo={integration.logo}
                connected={integration.connected}
                onConnect={() =>
                  toast(`${integration.name} integration coming soon!`)
                }
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
