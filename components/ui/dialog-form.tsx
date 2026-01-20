import { Loader } from 'lucide-react';
import * as React from 'react';

import { Button, type ButtonProps } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils/cn';

// DialogFormContent - wraps form fields with proper padding
interface DialogFormContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

function DialogFormContent({
  children,
  className,
  ...props
}: DialogFormContentProps) {
  return (
    <div className={cn('space-y-4 px-6 py-4', className)} {...props}>
      {children}
    </div>
  );
}

// DialogFormGrid - for multi-column layouts
const colsClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
} as const;

interface DialogFormGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  cols?: keyof typeof colsClasses;
}

function DialogFormGrid({
  children,
  cols = 2,
  className,
  ...props
}: DialogFormGridProps) {
  return (
    <div className={cn('grid gap-4', colsClasses[cols], className)} {...props}>
      {children}
    </div>
  );
}

// DialogFormActions - standard footer with loading state
interface DialogFormActionsProps {
  onCancel: () => void;
  isPending?: boolean;
  cancelLabel: string;
  submitLabel: string;
  submitIcon?: React.ReactNode;
  submitVariant?: ButtonProps['variant'];
}

function DialogFormActions({
  onCancel,
  isPending,
  cancelLabel,
  submitLabel,
  submitIcon,
  submitVariant = 'default',
}: DialogFormActionsProps) {
  return (
    <DialogFooter>
      <Button
        type='button'
        variant='outline'
        onClick={onCancel}
        disabled={isPending}
      >
        {cancelLabel}
      </Button>
      <Button type='submit' variant={submitVariant} disabled={isPending}>
        {isPending ? <Loader className='animate-spin' /> : submitIcon}
        {submitLabel}
      </Button>
    </DialogFooter>
  );
}

export { DialogFormActions, DialogFormContent, DialogFormGrid };
