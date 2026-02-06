"use client";

import { DataTable, Column } from "@/components/ui";
import { Building2 } from "lucide-react";

interface CompanyRow {
  name: string;
  peopleCount: number;
}

const columns: Column<CompanyRow>[] = [
  {
    key: "name",
    header: "Company",
    sortable: true,
    render: (val: string) => (
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-surface-4 flex items-center justify-center shrink-0">
          <Building2 className="w-3.5 h-3.5 text-text-muted" />
        </div>
        <span className="font-medium">{val}</span>
      </div>
    ),
  },
  {
    key: "peopleCount",
    header: "People",
    sortable: true,
    width: "120px",
  },
];

interface CompaniesTableProps {
  companies: CompanyRow[];
  loading?: boolean;
}

export function CompaniesTable({ companies, loading }: CompaniesTableProps) {
  return (
    <DataTable
      columns={columns}
      data={companies}
      rowKey="name"
      loading={loading}
      pageSize={25}
      emptyMessage="No companies found."
    />
  );
}
