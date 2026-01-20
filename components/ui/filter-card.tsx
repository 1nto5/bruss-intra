import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';
import * as React from 'react';

interface FilterCardProps extends React.ComponentProps<typeof Card> {
  children: React.ReactNode;
}

function FilterCard({ children, className, ...props }: FilterCardProps) {
  return (
    <Card className={cn(className)} {...props}>
      {children}
    </Card>
  );
}

interface FilterCardTogglesProps
  extends React.ComponentProps<typeof CardHeader> {
  children: React.ReactNode;
}

function FilterCardToggles({
  children,
  className,
  ...props
}: FilterCardTogglesProps) {
  return (
    <CardHeader className={cn('p-4', className)} {...props}>
      <div className='flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4 sm:flex-wrap'>
        {children}
      </div>
    </CardHeader>
  );
}

interface FilterCardContentProps
  extends React.ComponentProps<typeof CardContent> {
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
}

function FilterCardContent({
  children,
  className,
  onSubmit,
  ...props
}: FilterCardContentProps) {
  return (
    <CardContent className={cn('p-4 pt-4', className)} {...props}>
      <form
        onSubmit={onSubmit}
        className='flex flex-col gap-4'
      >
        {children}
      </form>
    </CardContent>
  );
}

export { FilterCard, FilterCardToggles, FilterCardContent };
