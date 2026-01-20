import { cn } from '@/lib/utils/cn';
import * as React from 'react';

interface FilterGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  cols?: 2 | 3 | 4 | 5;
}

const colsClasses = {
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
} as const;

function FilterGrid({
  children,
  cols = 4,
  className,
  ...props
}: FilterGridProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 sm:grid-cols-2',
        colsClasses[cols],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { FilterGrid };
