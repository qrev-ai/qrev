"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Check } from "lucide-react";

// Simple dropdown using native details/summary
interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}

const Dropdown = ({ trigger, children, align = "left", className }: DropdownProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on escape
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="focus:outline-none"
      >
        {trigger}
      </button>
      
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-2 min-w-[180px]",
            "bg-surface-3 border border-border rounded-md shadow-lg",
            "animate-fade-in origin-top-left",
            "py-1",
            align === "right" ? "right-0" : "left-0"
          )}
          onClick={() => setIsOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
};

// Dropdown item
interface DropdownItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  destructive?: boolean;
  selected?: boolean;
}

const DropdownItem = React.forwardRef<HTMLButtonElement, DropdownItemProps>(
  ({ className, icon, destructive, selected, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 text-sm text-left",
          "transition-colors duration-100",
          "hover:bg-surface-4",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          destructive ? "text-status-error" : "text-text-primary",
          selected && "bg-surface-4",
          className
        )}
        {...props}
      >
        {icon && <span className="shrink-0 w-4 h-4">{icon}</span>}
        <span className="flex-1">{children}</span>
        {selected && <Check className="h-4 w-4 text-accent shrink-0" />}
      </button>
    );
  }
);
DropdownItem.displayName = "DropdownItem";

// Dropdown separator
const DropdownSeparator = ({ className }: { className?: string }) => (
  <div className={cn("my-1 h-px bg-border", className)} />
);

// Dropdown header/label
const DropdownLabel = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "px-3 py-2 text-xs font-medium text-text-muted uppercase tracking-wider",
      className
    )}
  >
    {children}
  </div>
);

// Select-style dropdown
interface SelectDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}

const SelectDropdown = ({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className,
}: SelectDropdownProps) => {
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <Dropdown
      className={className}
      trigger={
        <div
          className={cn(
            "inline-flex items-center justify-between gap-2",
            "h-10 px-3 rounded-md min-w-[140px]",
            "bg-surface-2 border border-border",
            "hover:border-border-strong hover:bg-surface-3",
            "text-sm transition-colors"
          )}
        >
          <span className={selectedOption ? "text-text-primary" : "text-text-muted"}>
            {selectedOption?.label || placeholder}
          </span>
          <ChevronDown className="h-4 w-4 text-text-muted" />
        </div>
      }
    >
      {options.map((option) => (
        <DropdownItem
          key={option.value}
          onClick={() => onChange(option.value)}
          selected={option.value === value}
        >
          {option.label}
        </DropdownItem>
      ))}
    </Dropdown>
  );
};

export {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  DropdownLabel,
  SelectDropdown,
};
