"use client";

import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

interface IntegrationCardProps {
  name: string;
  description: string;
  logo: string; // emoji or text fallback
  connected?: boolean;
  onConnect?: () => void;
}

export function IntegrationCard({
  name,
  description,
  logo,
  connected,
  onConnect,
}: IntegrationCardProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-lg border transition-colors",
        "bg-surface-2 border-border"
      )}
    >
      <div className="w-10 h-10 rounded-lg bg-surface-4 flex items-center justify-center text-lg shrink-0">
        {logo}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-text-primary">{name}</h3>
        <p className="text-xs text-text-secondary mt-0.5">{description}</p>
      </div>
      {connected ? (
        <Button size="sm" variant="secondary" disabled>
          Connected
        </Button>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          rightIcon={<ExternalLink className="w-3 h-3" />}
          onClick={onConnect}
        >
          Connect
        </Button>
      )}
    </div>
  );
}
