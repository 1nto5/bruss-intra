import * as React from "react";

import { cn } from "@/lib/utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Industrial input: inset shadow, sharp corners, bruss focus ring
          "flex h-10 w-full rounded-sm border border-[var(--panel-border)] bg-[var(--panel-inset)] px-3 py-2 text-sm",
          "shadow-[inset_0_1px_2px_oklch(0.2_0.02_260/0.08)]",
          "ring-offset-background transition-all duration-150 ease-[var(--ease-standard)]",
          "placeholder:text-muted-foreground placeholder:uppercase placeholder:tracking-wide placeholder:text-xs",
          "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-bruss/50 focus-visible:ring-offset-1 focus-visible:border-bruss/50",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
