"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "info" | "outline";
  size?: "sm" | "md";
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    const variants = {
      default: "bg-surface-4 text-text-secondary",
      success: "bg-status-success/15 text-status-success",
      warning: "bg-status-warning/15 text-status-warning",
      error: "bg-status-error/15 text-status-error",
      info: "bg-status-info/15 text-status-info",
      outline: "bg-transparent border border-border text-text-secondary",
    };

    const sizes = {
      sm: "text-[10px] px-1.5 py-0.5",
      md: "text-xs px-2 py-1",
    };

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center font-medium rounded-full",
          "whitespace-nowrap select-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

// Status dot variant
interface StatusDotProps {
  status: "online" | "offline" | "busy" | "away";
  className?: string;
}

const StatusDot = ({ status, className }: StatusDotProps) => {
  const statusColors = {
    online: "bg-status-success",
    offline: "bg-text-muted",
    busy: "bg-status-error",
    away: "bg-status-warning",
  };

  return (
    <span
      className={cn(
        "inline-block w-2 h-2 rounded-full",
        statusColors[status],
        className
      )}
    />
  );
};

export { Badge, StatusDot };
