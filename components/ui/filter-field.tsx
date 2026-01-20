import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils/cn';
import * as React from 'react';

interface FilterFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  children: React.ReactNode;
}

function FilterField({
  label,
  children,
  className,
  ...props
}: FilterFieldProps) {
  return (
    <div className={cn('flex flex-col space-y-1', className)} {...props}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export { FilterField };
