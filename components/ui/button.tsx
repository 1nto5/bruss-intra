import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  // Base: Industrial mechanical button with tactile feedback
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-semibold tracking-wide ring-offset-background transition-all duration-150 ease-[var(--ease-standard)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:translate-y-[1px]",
  {
    variants: {
      variant: {
        // Primary: BRUSS green with mechanical depth
        default:
          "bg-primary text-primary-foreground shadow-[0_2px_0_0_oklch(0.55_0.12_126),0_3px_6px_-1px_oklch(0.2_0.02_260/0.2)] hover:bg-primary/90 hover:shadow-[0_2px_0_0_oklch(0.50_0.12_126),0_4px_8px_-1px_oklch(0.2_0.02_260/0.25)] active:shadow-[0_0_0_0_oklch(0.55_0.12_126),inset_0_1px_2px_oklch(0.2_0.02_260/0.2)]",
        // Destructive: Industrial red with urgency
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_2px_0_0_oklch(0.45_0.20_25),0_3px_6px_-1px_oklch(0.2_0.02_260/0.2)] hover:bg-destructive/90 hover:shadow-[0_2px_0_0_oklch(0.40_0.20_25),0_4px_8px_-1px_oklch(0.2_0.02_260/0.25)] active:shadow-[0_0_0_0_oklch(0.45_0.20_25),inset_0_1px_2px_oklch(0.2_0.02_260/0.2)]",
        // Outline: Technical border with subtle depth
        outline:
          "border border-input bg-background shadow-[0_1px_0_0_oklch(0.85_0.01_260),0_2px_4px_-1px_oklch(0.2_0.02_260/0.08)] hover:bg-accent hover:text-accent-foreground hover:border-accent-foreground/20 active:shadow-[inset_0_1px_2px_oklch(0.2_0.02_260/0.1)]",
        // Secondary: Steel panel button
        secondary:
          "bg-secondary text-secondary-foreground shadow-[0_1px_0_0_oklch(0.80_0.01_260),0_2px_4px_-1px_oklch(0.2_0.02_260/0.1)] hover:bg-secondary/80 active:shadow-[inset_0_1px_2px_oklch(0.2_0.02_260/0.15)]",
        // Ghost: Minimal, no mechanical effect
        ghost:
          "hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
        // Link: Text only
        link: "text-primary underline-offset-4 hover:underline active:translate-y-0",
        // Approve: Green industrial action
        approve:
          "border border-bruss/30 bg-bruss/10 text-bruss shadow-[0_1px_0_0_oklch(0.60_0.12_126/0.5),0_2px_4px_-1px_oklch(0.2_0.02_260/0.08)] hover:bg-bruss/20 hover:border-bruss/50 [&_svg]:text-bruss active:shadow-[inset_0_1px_2px_oklch(0.5_0.12_126/0.2)]",
        // Reject: Red industrial warning
        reject:
          "border border-red-300 bg-red-100 text-red-800 shadow-[0_1px_0_0_oklch(0.70_0.15_25/0.5),0_2px_4px_-1px_oklch(0.2_0.02_260/0.08)] hover:bg-red-200 hover:border-red-400 [&_svg]:text-red-800 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800 dark:hover:bg-red-900/50 active:shadow-[inset_0_1px_2px_oklch(0.5_0.15_25/0.2)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-sm px-3",
        lg: "h-11 rounded-sm px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
