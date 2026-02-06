"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button, Input, Tabs, TabList, Tab, TabPanel } from "@/components/ui";
import { CampaignTable } from "@/components/campaigns/CampaignTable";
import { useAuthStore } from "@/store/auth-store";

interface Campaign {
  id: string;
  name: string;
  status: string;
  totalProspects: number;
  sent: number;
  replied: number;
  bounced: number;
  updatedAt: string;
}

export default function CampaignsPage() {
  const { activeWorkspaceId } = useAuthStore();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/campaigns?workspaceId=${activeWorkspaceId}`);
      if (res.ok) setCampaigns(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleCreate = async () => {
    if (!newName.trim() || !activeWorkspaceId) return;
    setCreating(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: activeWorkspaceId, name: newName.trim() }),
      });
      if (res.ok) {
        setNewName("");
        setShowCreate(false);
        fetchCampaigns();
      }
    } catch {} finally {
      setCreating(false);
    }
  };

  // Split by type for tabs
  const sequences = campaigns.filter((c) => c.status !== "COMPLETED");
  const completed = campaigns.filter((c) => c.status === "COMPLETED");

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
        <h1 className="text-lg font-semibold text-text-primary">Campaigns</h1>
        <Button
          size="sm"
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => setShowCreate(true)}
        >
          New Campaign
        </Button>
      </div>

      {/* Create inline */}
      {showCreate && (
        <div className="flex items-center gap-3 px-6 py-3 bg-surface-0 border-b border-border-subtle">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Campaign name..."
            className="max-w-xs"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <Button size="sm" onClick={handleCreate} isLoading={creating}>
            Create
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setShowCreate(false); setNewName(""); }}>
            Cancel
          </Button>
        </div>
      )}

      {/* Tabs + Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <Tabs defaultTab="sequences">
          <TabList>
            <Tab value="sequences">
              Sequences ({sequences.length})
            </Tab>
            <Tab value="completed">
              Completed ({completed.length})
            </Tab>
          </TabList>

          <TabPanel value="sequences" className="mt-4">
            <CampaignTable campaigns={sequences} loading={loading} />
          </TabPanel>

          <TabPanel value="completed" className="mt-4">
            <CampaignTable campaigns={completed} loading={loading} />
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
}
