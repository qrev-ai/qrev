"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FileSpreadsheet } from "lucide-react";

interface CsvPreviewProps {
  data: Record<string, any>[];
  maxRows?: number;
}

export function CsvPreview({ data, maxRows = 5 }: CsvPreviewProps) {
  const [expanded, setExpanded] = useState(false);

  if (!data || data.length === 0) return null;

  const columns = Object.keys(data[0]);
  const displayData = expanded ? data : data.slice(0, maxRows);

  return (
    <div className="bg-surface-2 border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border-subtle bg-surface-3/50">
        <FileSpreadsheet className="w-3.5 h-3.5 text-accent" />
        <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
          CSV Data
        </span>
        <span className="text-xs text-text-muted ml-auto">
          {data.length} rows
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left text-xs font-medium text-text-muted whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayData.map((row, i) => (
              <tr
                key={i}
                className="border-b border-border-subtle last:border-0"
              >
                {columns.map((col) => (
                  <td
                    key={col}
                    className="px-3 py-2 text-text-primary whitespace-nowrap max-w-[200px] truncate"
                  >
                    {String(row[col] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expand/Collapse */}
      {data.length > maxRows && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1.5 px-4 py-2 border-t border-border-subtle text-xs text-text-muted hover:text-text-secondary hover:bg-surface-3 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3 h-3" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              Show all {data.length} rows
            </>
          )}
        </button>
      )}
    </div>
  );
}
