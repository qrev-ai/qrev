"use client";

import { useRouter } from "next/navigation";
import { DataTable, Column, Badge } from "@/components/ui";

interface CampaignRow {
  id: string;
  name: string;
  status: string;
  totalProspects: number;
  sent: number;
  replied: number;
  bounced: number;
  updatedAt: string;
}

const statusVariant: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  DRAFT: "default",
  ACTIVE: "success",
  PAUSED: "warning",
  COMPLETED: "info",
};

const columns: Column<CampaignRow>[] = [
  {
    key: "name",
    header: "Name",
    sortable: true,
    render: (val) => <span className="font-medium">{val}</span>,
  },
  {
    key: "status",
    header: "Status",
    sortable: true,
    render: (val: string) => (
      <Badge variant={statusVariant[val] || "default"} size="sm">
        {val.charAt(0) + val.slice(1).toLowerCase()}
      </Badge>
    ),
  },
  {
    key: "totalProspects",
    header: "Prospects",
    sortable: true,
  },
  {
    key: "sent",
    header: "Sent",
    sortable: true,
  },
  {
    key: "replied",
    header: "Replied",
    sortable: true,
    render: (val: number, row: CampaignRow) => {
      const rate = row.sent > 0 ? ((val / row.sent) * 100).toFixed(0) : "0";
      return (
        <span>
          {val}{" "}
          <span className="text-text-muted">({rate}%)</span>
        </span>
      );
    },
  },
];

interface CampaignTableProps {
  campaigns: CampaignRow[];
  loading?: boolean;
}

export function CampaignTable({ campaigns, loading }: CampaignTableProps) {
  const router = useRouter();

  return (
    <DataTable
      columns={columns}
      data={campaigns}
      loading={loading}
      pageSize={20}
      emptyMessage="No campaigns yet. Create your first campaign to get started."
      onRowClick={(row) => router.push(`/campaigns/${row.id}`)}
    />
  );
}
