"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const variants = {
      primary: cn(
        "bg-accent text-surface-0 font-medium",
        "hover:bg-accent-hover active:bg-accent-muted",
        "shadow-sm hover:shadow"
      ),
      secondary: cn(
        "bg-surface-3 text-text-primary",
        "hover:bg-surface-4 active:bg-surface-2",
        "border border-border"
      ),
      ghost: cn(
        "bg-transparent text-text-secondary",
        "hover:bg-surface-3 hover:text-text-primary",
        "active:bg-surface-2"
      ),
      danger: cn(
        "bg-status-error/10 text-status-error",
        "hover:bg-status-error/20 active:bg-status-error/30",
        "border border-status-error/20"
      ),
    };

    const sizes = {
      sm: "h-8 px-3 text-xs rounded",
      md: "h-9 px-4 text-sm rounded-md",
      lg: "h-11 px-6 text-base rounded-md",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2",
          "font-medium transition-all duration-150",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1",
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children}
        {!isLoading && rightIcon && (
          <span className="shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
