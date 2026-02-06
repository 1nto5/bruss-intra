import * as React from 'react';

import { cn } from '@/lib/utils/cn';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-sm border border-[var(--panel-border)] bg-[var(--panel-inset)] px-3 py-2 text-sm',
          'shadow-[inset_0_1px_2px_oklch(0.2_0.02_260/0.08)]',
          'ring-offset-background transition-all duration-150 ease-[var(--ease-standard)]',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-bruss/50 focus-visible:ring-offset-1 focus-visible:border-bruss/50',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
