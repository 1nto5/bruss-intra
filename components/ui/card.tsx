import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils/cn";

// Industrial card variants for different use cases
const cardVariants = cva(
  // Base: Industrial metal panel with precision borders
  "bg-card text-card-foreground rounded-sm border transition-all duration-200",
  {
    variants: {
      variant: {
        // Default: Clean panel with subtle shadow
        default:
          "border-[var(--panel-border)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow)]",
        // Elevated: Prominent panel for key content
        elevated:
          "border-[var(--panel-border)] shadow-[var(--shadow-md)] hover:shadow-[0_4px_12px_oklch(0.2_0.02_260/0.12)]",
        // Inset: Recessed panel for nested content
        inset:
          "border-[var(--panel-border)] bg-[var(--panel-inset)] shadow-[inset_0_1px_2px_oklch(0.2_0.02_260/0.06)]",
        // Interactive: Clickable panel with hover lift
        interactive:
          "border-[var(--panel-border)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 cursor-pointer",
        // Status: Panel with top accent bar (use with data-status)
        status:
          "border-[var(--panel-border)] shadow-[var(--shadow-sm)] overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-[var(--panel-border)] relative",
        // Ghost: Minimal, no border/shadow
        ghost: "border-transparent shadow-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface CardProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  /** Status color for status variant: 'success' | 'warning' | 'error' | 'info' */
  status?: "success" | "warning" | "error" | "info";
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, status, ...props }, ref) => {
    const statusColors = {
      success: "before:bg-[var(--led-green)]",
      warning: "before:bg-[var(--led-amber)]",
      error: "before:bg-[var(--led-red)]",
      info: "before:bg-[var(--led-blue)]",
    };

    return (
      <div
        ref={ref}
        className={cn(
          cardVariants({ variant }),
          variant === "status" && status && statusColors[status],
          className,
        )}
        {...props}
      />
    );
  },
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5 p-6 border-b border-[var(--panel-border)]/50",
      className,
    )}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      // Industrial heading: display font, tight tracking, semibold
      "font-display text-xl leading-none font-semibold tracking-tight",
      className,
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
    className={cn("text-muted-foreground text-sm", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-5", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center p-4 border-t border-[var(--panel-border)]/30 mt-auto bg-[var(--panel-inset)]/30",
      className,
    )}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  cardVariants,
};
