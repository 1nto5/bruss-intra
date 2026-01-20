import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { CircleX, Loader, Search } from 'lucide-react';
import * as React from 'react';

interface FilterActionsProps {
  onClear: () => void;
  isPending?: boolean;
  disabled?: boolean;
  clearLabel: string;
  searchLabel: string;
  className?: string;
}

function FilterActions({
  onClear,
  isPending = false,
  disabled = false,
  clearLabel,
  searchLabel,
  className,
}: FilterActionsProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 sm:flex-row sm:justify-between',
        className,
      )}
    >
      <Button
        type='button'
        variant='destructive'
        onClick={onClear}
        disabled={isPending || disabled}
        className='order-2 w-full sm:order-1 sm:w-auto'
      >
        <CircleX /> <span>{clearLabel}</span>
      </Button>

      <Button
        type='submit'
        variant='secondary'
        disabled={isPending || disabled}
        className='order-1 w-full sm:order-2 sm:w-auto'
      >
        {isPending ? <Loader className='animate-spin' /> : <Search />}
        <span>{searchLabel}</span>
      </Button>
    </div>
  );
}

export { FilterActions };
