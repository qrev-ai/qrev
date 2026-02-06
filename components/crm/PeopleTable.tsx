"use client";

import { DataTable, Column, Badge } from "@/components/ui";

interface PersonRow {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  title: string | null;
  linkedinUrl: string | null;
  campaignCount: number;
  createdAt: string;
}

const columns: Column<PersonRow>[] = [
  {
    key: "firstName",
    header: "Name",
    sortable: true,
    render: (_val: string | null, row: PersonRow) => {
      const name = [row.firstName, row.lastName].filter(Boolean).join(" ");
      return <span className="font-medium">{name || "-"}</span>;
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
    key: "campaignCount",
    header: "Campaigns",
    sortable: true,
    render: (val: number) =>
      val > 0 ? (
        <Badge variant="info" size="sm">
          {val}
        </Badge>
      ) : (
        <span className="text-text-muted">0</span>
      ),
  },
];

interface PeopleTableProps {
  people: PersonRow[];
  loading?: boolean;
}

export function PeopleTable({ people, loading }: PeopleTableProps) {
  return (
    <DataTable
      columns={columns}
      data={people}
      loading={loading}
      selectable
      pageSize={25}
      emptyMessage="No people found. Import prospects to get started."
    />
  );
}
