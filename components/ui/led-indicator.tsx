"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const ledVariants = cva(
  // Base LED: circular with glow effect
  "inline-block rounded-full transition-all duration-200",
  {
    variants: {
      color: {
        green: "bg-[var(--led-green)] shadow-[0_0_6px_var(--led-green-glow)]",
        amber: "bg-[var(--led-amber)] shadow-[0_0_6px_var(--led-amber-glow)]",
        red: "bg-[var(--led-red)] shadow-[0_0_6px_var(--led-red-glow)]",
        blue: "bg-[var(--led-blue)] shadow-[0_0_6px_var(--led-blue-glow)]",
        off: "bg-gray-400 shadow-none opacity-40",
      },
      size: {
        sm: "h-2 w-2",
        default: "h-2.5 w-2.5",
        lg: "h-3 w-3",
      },
      animation: {
        none: "",
        pulse: "animate-[industrial-pulse_2s_ease-in-out_infinite]",
        blink: "animate-[blink_1.5s_ease-in-out_infinite]",
        "blink-fast": "animate-[blink_0.8s_ease-in-out_infinite]",
      },
    },
    defaultVariants: {
      color: "green",
      size: "default",
      animation: "none",
    },
  },
);

export interface LedIndicatorProps
  extends
    Omit<React.HTMLAttributes<HTMLSpanElement>, "color">,
    VariantProps<typeof ledVariants> {
  /** Optional label to display next to the LED */
  label?: string;
  /** Label position */
  labelPosition?: "left" | "right";
}

function LedIndicator({
  className,
  color,
  size,
  animation,
  label,
  labelPosition = "right",
  ...props
}: LedIndicatorProps) {
  const led = (
    <span
      className={cn(ledVariants({ color, size, animation }), className)}
      {...props}
    />
  );

  if (!label) return led;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide",
        labelPosition === "left" && "flex-row-reverse",
      )}
    >
      {led}
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

export { LedIndicator, ledVariants };
