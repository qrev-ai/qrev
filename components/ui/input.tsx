"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "w-full h-10 rounded-md",
            "bg-surface-0 text-text-primary placeholder:text-text-muted",
            "border border-border hover:border-border-strong",
            "focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent",
            "transition-all duration-150",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            leftIcon ? "pl-10" : "px-3",
            rightIcon ? "pr-10" : "px-3",
            error && "border-status-error focus:ring-status-error",
            className
          )}
          ref={ref}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
            {rightIcon}
          </div>
        )}
        {error && (
          <p className="mt-1.5 text-xs text-status-error">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

// Search input variant
const SearchInput = React.forwardRef<HTMLInputElement, Omit<InputProps, "leftIcon">>(
  ({ className, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="search"
        leftIcon={<Search className="h-4 w-4" />}
        placeholder="Search..."
        className={cn("bg-surface-2", className)}
        {...props}
      />
    );
  }
);
SearchInput.displayName = "SearchInput";

// Textarea
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div>
        <textarea
          className={cn(
            "w-full min-h-[100px] rounded-md p-3",
            "bg-surface-0 text-text-primary placeholder:text-text-muted",
            "border border-border hover:border-border-strong",
            "focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent",
            "transition-all duration-150 resize-y",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error && "border-status-error focus:ring-status-error",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-status-error">{error}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Input, SearchInput, Textarea };
