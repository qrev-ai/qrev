"use client";

import { Card, CardContent, Badge } from "@/components/ui";
import { Users, Send, Reply, AlertTriangle } from "lucide-react";

interface CampaignOverviewProps {
  campaign: {
    name: string;
    description: string | null;
    status: string;
    stats: {
      total: number;
      sent: number;
      replied: number;
      bounced: number;
    };
    steps: {
      id: string;
      stepNumber: number;
      subjectTemplate: string;
      delayDays: number;
    }[];
  };
}

const statusVariant: Record<string, "default" | "success" | "warning" | "info"> = {
  DRAFT: "default",
  ACTIVE: "success",
  PAUSED: "warning",
  COMPLETED: "info",
};

export function CampaignOverview({ campaign }: CampaignOverviewProps) {
  const { stats, steps } = campaign;
  const openRate = stats.sent > 0 ? ((stats.replied / stats.sent) * 100).toFixed(1) : "0";

  const statCards = [
    {
      label: "Total Prospects",
      value: stats.total,
      icon: Users,
      color: "text-text-primary",
    },
    {
      label: "Sent",
      value: stats.sent,
      icon: Send,
      color: "text-status-info",
    },
    {
      label: "Replied",
      value: `${stats.replied} (${openRate}%)`,
      icon: Reply,
      color: "text-status-success",
    },
    {
      label: "Bounced",
      value: stats.bounced,
      icon: AlertTriangle,
      color: "text-status-error",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-xs text-text-muted">{s.label}</span>
              </div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Campaign steps */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">
          Campaign Steps
        </h3>
        {steps.length === 0 ? (
          <p className="text-sm text-text-muted">No steps configured yet.</p>
        ) : (
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div
                key={step.id}
                className="flex items-center gap-3 px-4 py-3 bg-surface-2 border border-border-subtle rounded-lg"
              >
                <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center text-xs font-bold text-accent shrink-0">
                  {step.stepNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate">
                    {step.subjectTemplate}
                  </p>
                  {step.delayDays > 0 && (
                    <p className="text-xs text-text-muted">
                      {step.delayDays} day{step.delayDays > 1 ? "s" : ""} after
                      previous step
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
