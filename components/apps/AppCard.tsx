"use client";

import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface AppCardProps {
  name: string;
  description: string;
  icon: LucideIcon;
  installed?: boolean;
  onClick?: () => void;
}

export function AppCard({
  name,
  description,
  icon: Icon,
  installed,
  onClick,
}: AppCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-5 rounded-lg border transition-colors",
        "bg-surface-2 border-border hover:bg-surface-3 hover:border-border-strong"
      )}
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-text-primary">{name}</h3>
            {installed && (
              <Badge variant="success" size="sm">
                Installed
              </Badge>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-1 line-clamp-2">
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}
