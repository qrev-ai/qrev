"use client";

import { DataTable, Column, Badge } from "@/components/ui";
import { formatDistanceToNow } from "date-fns";

interface ProspectRow {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  title: string | null;
  status: string;
  currentStep: number;
  lastSentAt: string | null;
}

const statusVariant: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  PENDING: "default",
  RESEARCHING: "info",
  READY: "info",
  SENT: "warning",
  REPLIED: "success",
  BOUNCED: "error",
  OPTED_OUT: "default",
};

const columns: Column<ProspectRow>[] = [
  {
    key: "firstName",
    header: "Name",
    sortable: true,
    render: (_val: string | null, row: ProspectRow) => {
      const name = [row.firstName, row.lastName].filter(Boolean).join(" ");
      return <span className="font-medium">{name || row.email}</span>;
    },
  },
  {
    key: "email",
    header: "Email",
    sortable: true,
    render: (val: string) => (
      <span className="text-text-secondary">{val}</span>
    ),
  },
  {
    key: "company",
    header: "Company",
    sortable: true,
  },
  {
    key: "title",
    header: "Title",
    sortable: true,
    render: (val: string | null) => (
      <span className="text-text-secondary">{val || "-"}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    sortable: true,
    render: (val: string) => (
      <Badge variant={statusVariant[val] || "default"} size="sm">
        {val.charAt(0) + val.slice(1).toLowerCase().replace("_", " ")}
      </Badge>
    ),
  },
  {
    key: "currentStep",
    header: "Step",
    sortable: true,
    render: (val: number) => (
      <span className="text-text-secondary">{val || "-"}</span>
    ),
  },
  {
    key: "lastSentAt",
    header: "Last Sent",
    sortable: true,
    render: (val: string | null) =>
      val ? (
        <span className="text-text-muted text-xs">
          {formatDistanceToNow(new Date(val), { addSuffix: true })}
        </span>
      ) : (
        <span className="text-text-muted">-</span>
      ),
  },
];

interface ProspectsTableProps {
  prospects: ProspectRow[];
  loading?: boolean;
}

export function ProspectsTable({ prospects, loading }: ProspectsTableProps) {
  return (
    <DataTable
      columns={columns}
      data={prospects}
      loading={loading}
      selectable
      pageSize={25}
      emptyMessage="No prospects in this campaign yet."
    />
  );
}
