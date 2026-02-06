"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, row: T, index: number) => React.ReactNode;
}

type SortDirection = "asc" | "desc";

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  /** Unique key field on each row — defaults to "id" */
  rowKey?: string;
  /** Enable row selection */
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  /** Rows per page, 0 = no pagination */
  pageSize?: number;
  /** Loading state */
  loading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Click handler for a row */
  onRowClick?: (row: T) => void;
  className?: string;
}

// ─── Component ──────────────────────────────────────

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  rowKey = "id",
  selectable = false,
  selectedKeys,
  onSelectionChange,
  pageSize = 0,
  loading = false,
  emptyMessage = "No data",
  onRowClick,
  className,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<SortDirection>("asc");
  const [page, setPage] = React.useState(0);

  // ── Sorting ──
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  };

  const sorted = React.useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  // ── Pagination ──
  const totalPages =
    pageSize > 0 ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const paginated =
    pageSize > 0
      ? sorted.slice(page * pageSize, (page + 1) * pageSize)
      : sorted;

  // ── Selection ──
  const selected = selectedKeys ?? new Set<string>();
  const allOnPageSelected =
    paginated.length > 0 && paginated.every((r) => selected.has(r[rowKey]));

  const toggleAll = () => {
    if (!onSelectionChange) return;
    const next = new Set(selected);
    if (allOnPageSelected) {
      paginated.forEach((r) => next.delete(r[rowKey]));
    } else {
      paginated.forEach((r) => next.add(r[rowKey]));
    }
    onSelectionChange(next);
  };

  const toggleRow = (key: string) => {
    if (!onSelectionChange) return;
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange(next);
  };

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className={cn("rounded-lg border border-border overflow-hidden", className)}>
        <table className="w-full">
          <thead>
            <tr className="bg-surface-0 border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-border-subtle">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="h-4 bg-surface-3 rounded animate-pulse w-3/4" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ── Empty state ──
  if (data.length === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border overflow-hidden",
          className
        )}
      >
        <table className="w-full">
          <thead>
            <tr className="bg-surface-0 border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
        </table>
        <div className="flex items-center justify-center py-16 text-text-muted text-sm">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border border-border overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Header */}
          <thead>
            <tr className="bg-surface-0 border-b border-border">
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleAll}
                    className="rounded border-border bg-surface-2 text-accent focus:ring-accent"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider",
                    col.sortable && "cursor-pointer select-none hover:text-text-secondary"
                  )}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && (
                      <span className="inline-flex flex-col">
                        {sortKey === col.key ? (
                          sortDir === "asc" ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )
                        ) : (
                          <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {paginated.map((row, idx) => {
              const key = row[rowKey] ?? idx;
              const isSelected = selected.has(key);
              return (
                <tr
                  key={key}
                  className={cn(
                    "border-b border-border-subtle last:border-0 transition-colors",
                    isSelected ? "bg-accent/5" : "hover:bg-surface-2",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <td className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(key)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-border bg-surface-2 text-accent focus:ring-accent"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-4 py-3 text-sm text-text-primary"
                    >
                      {col.render
                        ? col.render(row[col.key], row, idx)
                        : String(row[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageSize > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle">
          <span className="text-xs text-text-muted">
            Showing {page * pageSize + 1}–
            {Math.min((page + 1) * pageSize, sorted.length)} of{" "}
            {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="p-1.5 rounded-md hover:bg-surface-3 disabled:opacity-30 disabled:cursor-not-allowed text-text-muted"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-text-secondary px-2">
              {page + 1} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded-md hover:bg-surface-3 disabled:opacity-30 disabled:cursor-not-allowed text-text-muted"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
