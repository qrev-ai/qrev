"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Play, Pause, Trash2 } from "lucide-react";
import { Button, Badge, Tabs, TabList, Tab, TabPanel } from "@/components/ui";
import { CampaignOverview } from "@/components/campaigns/CampaignOverview";
import { ProspectsTable } from "@/components/campaigns/ProspectsTable";

interface CampaignDetail {
  id: string;
  name: string;
  description: string | null;
  status: string;
  stats: { total: number; sent: number; replied: number; bounced: number };
  steps: { id: string; stepNumber: number; subjectTemplate: string; delayDays: number; bodyTemplate: string }[];
  prospects: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    company: string | null;
    title: string | null;
    status: string;
    currentStep: number;
    lastSentAt: string | null;
  }[];
}

const statusVariant: Record<string, "default" | "success" | "warning" | "info"> = {
  DRAFT: "default",
  ACTIVE: "success",
  PAUSED: "warning",
  COMPLETED: "info",
};

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCampaign = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      if (res.ok) {
        setCampaign(await res.json());
      } else {
        router.push("/campaigns");
      }
    } catch {
      router.push("/campaigns");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  const handleStatusChange = async (newStatus: string) => {
    if (!campaign) return;
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchCampaign();
    } catch {}
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      if (res.ok) router.push("/campaigns");
    } catch {}
  };

  if (loading || !campaign) {
    return (
      <div className="p-6 animate-pulse space-y-4">
        <div className="h-6 w-48 bg-surface-3 rounded" />
        <div className="h-4 w-96 bg-surface-3 rounded" />
        <div className="grid grid-cols-4 gap-4 mt-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-surface-2 rounded-lg border border-border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/campaigns")}
            className="p-1.5 rounded-md hover:bg-surface-3 text-text-muted"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-text-primary">
                {campaign.name}
              </h1>
              <Badge variant={statusVariant[campaign.status] || "default"} size="sm">
                {campaign.status.charAt(0) + campaign.status.slice(1).toLowerCase()}
              </Badge>
            </div>
            {campaign.description && (
              <p className="text-sm text-text-muted mt-0.5">
                {campaign.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {campaign.status === "DRAFT" || campaign.status === "PAUSED" ? (
            <Button
              size="sm"
              leftIcon={<Play className="w-3.5 h-3.5" />}
              onClick={() => handleStatusChange("ACTIVE")}
            >
              Activate
            </Button>
          ) : campaign.status === "ACTIVE" ? (
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Pause className="w-3.5 h-3.5" />}
              onClick={() => handleStatusChange("PAUSED")}
            >
              Pause
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="danger"
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <Tabs defaultTab="overview">
          <TabList>
            <Tab value="overview">Overview</Tab>
            <Tab value="prospects">
              Prospects ({campaign.prospects.length})
            </Tab>
          </TabList>

          <TabPanel value="overview" className="mt-4">
            <CampaignOverview campaign={campaign} />
          </TabPanel>

          <TabPanel value="prospects" className="mt-4">
            <ProspectsTable prospects={campaign.prospects} />
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
}
