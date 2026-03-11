"use client";

import * as ProgressPrimitive from "@radix-ui/react-progress";
import * as React from "react";

import { cn } from "@/lib/utils/cn";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    /** Show gauge-style appearance with industrial styling */
    variant?: "default" | "gauge";
  }
>(({ className, value, variant = "default", ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      // Industrial progress bar: rounded-sm, inset shadow
      "relative h-3 w-full overflow-hidden rounded-sm",
      "bg-[var(--panel-inset)] shadow-[inset_0_1px_2px_oklch(0.2_0.02_260/0.1)]",
      variant === "gauge" && "h-4",
      className,
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        "h-full w-full flex-1 transition-all duration-300 ease-[var(--ease-standard)]",
        // Industrial gradient fill
        "bg-gradient-to-r from-bruss to-bruss/80",
        // Shimmer effect for gauge variant
        variant === "gauge" &&
          "relative after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent after:animate-[shimmer_2s_infinite]",
      )}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
