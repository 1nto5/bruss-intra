import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils/cn';
import * as React from 'react';

interface FilterToggleProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  badge?: React.ReactNode;
  className?: string;
}

function FilterToggle({
  id,
  checked,
  onCheckedChange,
  label,
  badge,
  className,
}: FilterToggleProps) {
  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
      <Label htmlFor={id}>
        {label}
        {badge && <span className='ml-1'>{badge}</span>}
      </Label>
    </div>
  );
}

export { FilterToggle };
