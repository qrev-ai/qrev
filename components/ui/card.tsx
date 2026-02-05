"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "ghost";
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants = {
      default: "bg-surface-2 border border-border",
      elevated: "bg-surface-3 shadow-md border border-border-subtle",
      ghost: "bg-transparent",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg overflow-hidden",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-5 py-4 border-b border-border-subtle", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-base font-semibold text-text-primary leading-tight",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-text-secondary mt-1", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-5", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "px-5 py-4 border-t border-border-subtle flex items-center gap-3",
      className
    )}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

// Loading skeleton for cards
const CardSkeleton = ({ className }: { className?: string }) => (
  <Card className={cn("animate-pulse", className)}>
    <CardHeader>
      <div className="h-5 w-1/3 bg-surface-4 rounded" />
      <div className="h-4 w-2/3 bg-surface-3 rounded mt-2" />
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="h-4 w-full bg-surface-3 rounded" />
      <div className="h-4 w-5/6 bg-surface-3 rounded" />
      <div className="h-4 w-4/6 bg-surface-3 rounded" />
    </CardContent>
  </Card>
);

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardSkeleton,
};
