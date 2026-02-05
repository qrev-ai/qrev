"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, fallback, size = "md", ...props }, ref) => {
    const [hasError, setHasError] = React.useState(false);

    const sizes = {
      xs: "h-6 w-6 text-[10px]",
      sm: "h-8 w-8 text-xs",
      md: "h-10 w-10 text-sm",
      lg: "h-12 w-12 text-base",
      xl: "h-16 w-16 text-lg",
    };

    const iconSizes = {
      xs: "h-3 w-3",
      sm: "h-4 w-4",
      md: "h-5 w-5",
      lg: "h-6 w-6",
      xl: "h-8 w-8",
    };

    // Get initials from fallback string
    const getInitials = (name?: string) => {
      if (!name) return null;
      const parts = name.trim().split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    };

    const showImage = src && !hasError;
    const initials = getInitials(fallback);

    return (
      <div
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center",
          "rounded-full overflow-hidden",
          "bg-surface-3 text-text-secondary font-medium",
          "select-none shrink-0",
          sizes[size],
          className
        )}
        {...props}
      >
        {showImage ? (
          <img
            src={src}
            alt={alt || fallback || "Avatar"}
            className="h-full w-full object-cover"
            onError={() => setHasError(true)}
          />
        ) : initials ? (
          <span>{initials}</span>
        ) : (
          <User className={cn("text-text-muted", iconSizes[size])} />
        )}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";

// Avatar group for displaying multiple avatars
interface AvatarGroupProps {
  children: React.ReactNode;
  max?: number;
  size?: AvatarProps["size"];
  className?: string;
}

const AvatarGroup = ({
  children,
  max = 4,
  size = "md",
  className,
}: AvatarGroupProps) => {
  const childArray = React.Children.toArray(children);
  const visibleAvatars = childArray.slice(0, max);
  const remainingCount = childArray.length - max;

  const overlapSizes = {
    xs: "-ml-1.5",
    sm: "-ml-2",
    md: "-ml-2.5",
    lg: "-ml-3",
    xl: "-ml-4",
  };

  return (
    <div className={cn("flex items-center", className)}>
      {visibleAvatars.map((child, index) => (
        <div
          key={index}
          className={cn(
            index !== 0 && overlapSizes[size],
            "ring-2 ring-surface-1 rounded-full"
          )}
        >
          {React.isValidElement<AvatarProps>(child)
            ? React.cloneElement(child, { size })
            : child}
        </div>
      ))}
      {remainingCount > 0 && (
        <Avatar
          size={size}
          fallback={`+${remainingCount}`}
          className={cn(overlapSizes[size], "ring-2 ring-surface-1")}
        />
      )}
    </div>
  );
};

export { Avatar, AvatarGroup };
