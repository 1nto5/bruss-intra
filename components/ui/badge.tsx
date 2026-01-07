import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils/cn';

// LED indicator base classes for status badges
// !pl-6 = 24px (forced) with left-2 (8px) + size-1.5 (6px) = 10px clearance
// Using !important (!) to override px-2.5 from size variants which appears later in CVA output
const ledBase =
  'relative !pl-6 before:absolute before:left-2 before:top-1/2 before:-translate-y-1/2 before:size-1.5 before:rounded-full';
const ledGlow = (color: string) =>
  `before:bg-[var(--led-${color})] before:shadow-[0_0_6px_var(--led-${color}-glow)]`;

const badgeVariants = cva(
  // Base: Industrial badge with tracking
  'inline-flex items-center rounded-sm border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        // Core variants with industrial styling
        default:
          'border-transparent bg-primary text-primary-foreground shadow-sm hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/80',
        outline:
          'text-foreground border-input',

        // Status badges with LED indicators
        // Pending states - amber LED with pulse animation
        statusPending: `${ledBase} border-amber-200 bg-amber-50 text-amber-800 before:bg-[var(--led-amber)] before:shadow-[0_0_6px_var(--led-amber-glow)] before:animate-[blink_1.5s_ease-in-out_infinite] dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200`,
        statusToApprove: `${ledBase} border-amber-200 bg-amber-50 text-amber-800 before:bg-[var(--led-amber)] before:shadow-[0_0_6px_var(--led-amber-glow)] before:animate-[blink_1.5s_ease-in-out_infinite] dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200`,
        statusToReview: `${ledBase} border-amber-200 bg-amber-50 text-amber-800 before:bg-[var(--led-amber)] before:shadow-[0_0_6px_var(--led-amber-glow)] before:animate-[blink_1.5s_ease-in-out_infinite] dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200`,

        // Pre-approved state - teal LED (intermediate between pending and approved)
        statusPreApproved: `${ledBase} border-teal-200 bg-teal-50 text-teal-800 before:bg-[var(--led-green)] before:shadow-[0_0_6px_var(--led-green-glow)] before:animate-[blink_2s_ease-in-out_infinite] dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-200`,

        // Approved/Success states - green LED steady
        statusApproved: `${ledBase} border-bruss/30 bg-bruss/10 text-bruss before:bg-[var(--led-green)] before:shadow-[0_0_6px_var(--led-green-glow)] dark:border-bruss/50 dark:bg-bruss/20`,
        statusInUse: `${ledBase} border-green-200 bg-green-50 text-green-800 before:bg-[var(--led-green)] before:shadow-[0_0_6px_var(--led-green-glow)] dark:border-green-800 dark:bg-green-950/50 dark:text-green-200`,

        // In Progress states - blue LED with pulse
        statusInProgress: `${ledBase} whitespace-nowrap border-blue-200 bg-blue-50 text-blue-800 before:bg-[var(--led-blue)] before:shadow-[0_0_6px_var(--led-blue-glow)] before:animate-[industrial-pulse_2s_ease-in-out_infinite] dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200`,
        statusInStock: `${ledBase} border-blue-200 bg-blue-50 text-blue-800 before:bg-[var(--led-blue)] before:shadow-[0_0_6px_var(--led-blue-glow)] dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200`,
        statusForecast: `${ledBase} border-sky-200 bg-sky-50 text-sky-800 before:bg-[var(--led-blue)] before:shadow-[0_0_6px_var(--led-blue-glow)] dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-200`,

        // Error/Rejected states - red LED steady
        statusRejected: `${ledBase} border-red-200 bg-red-50 text-red-800 before:bg-[var(--led-red)] before:shadow-[0_0_6px_var(--led-red-glow)] dark:border-red-800 dark:bg-red-950/50 dark:text-red-200`,
        statusToDispose: `${ledBase} border-red-200 bg-red-50 text-red-800 before:bg-[var(--led-red)] before:shadow-[0_0_6px_var(--led-red-glow)] dark:border-red-800 dark:bg-red-950/50 dark:text-red-200`,
        statusOverdue: `${ledBase} border-orange-200 bg-orange-50 text-orange-800 before:bg-[var(--led-red)] before:shadow-[0_0_6px_var(--led-red-glow)] before:animate-[blink_0.8s_ease-in-out_infinite] dark:border-orange-800 dark:bg-orange-950/50 dark:text-orange-200`,

        // Warning states - amber LED
        statusDamaged: `${ledBase} border-orange-200 bg-orange-50 text-orange-800 before:bg-[var(--led-amber)] before:shadow-[0_0_6px_var(--led-amber-glow)] dark:border-orange-800 dark:bg-orange-950/50 dark:text-orange-200`,
        statusToRepair: `${ledBase} border-amber-200 bg-amber-50 text-amber-800 before:bg-[var(--led-amber)] before:shadow-[0_0_6px_var(--led-amber-glow)] dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200`,

        // Neutral/Inactive states - no LED, muted styling
        statusClosed:
          'border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400',
        statusCancelled:
          'border-gray-200 bg-gray-100 text-gray-500 line-through dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500',
        statusDisposed:
          'border-gray-200 bg-gray-100 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500',

        // Special states
        statusDraft: `${ledBase} border-purple-200 bg-purple-50 text-purple-800 before:bg-purple-400 before:shadow-[0_0_4px_oklch(0.6_0.2_300/0.4)] dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-200`,
        statusOpen: `${ledBase} border-teal-200 bg-teal-50 text-teal-800 before:bg-teal-400 before:shadow-[0_0_4px_oklch(0.65_0.15_180/0.4)] dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-200`,
        statusAccounted: `${ledBase} border-indigo-200 bg-indigo-50 text-indigo-800 before:bg-indigo-400 before:shadow-[0_0_4px_oklch(0.55_0.2_280/0.4)] dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200`,
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs',
        sm: 'px-2 py-0.5 text-[10px]',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
