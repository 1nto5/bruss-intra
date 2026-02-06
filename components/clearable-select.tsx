'use client';

import { CircleX } from 'lucide-react';
import * as React from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ClearableSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  clearLabel: string;
  options: Array<{ value: string; label: string }>;
  className?: string;
  disabled?: boolean;
}

export function ClearableSelect({
  value,
  onValueChange,
  placeholder = 'Select...',
  clearLabel,
  options,
  className,
  disabled,
}: ClearableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [showClear, setShowClear] = React.useState(!!value);

  // Delay showing clear button to prevent flickering when selecting an option
  React.useEffect(() => {
    if (value) {
      const timer = setTimeout(() => setShowClear(true), 100);
      return () => clearTimeout(timer);
    } else {
      setShowClear(false);
    }
  }, [value]);

  const handleClear = () => {
    onValueChange('');
    setOpen(false);
  };

  const handleValueChange = (newValue: string) => {
    onValueChange(newValue);
  };

  return (
    <Select
      key={value || 'empty'}
      value={value || undefined}
      onValueChange={handleValueChange}
      disabled={disabled}
      open={open}
      onOpenChange={setOpen}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {showClear && (
          <div
            className='relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none bg-destructive/10 text-destructive hover:bg-destructive/20'
            onClick={handleClear}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClear();
              }
            }}
            tabIndex={0}
            role='button'
          >
            <CircleX />
            {clearLabel}
          </div>
        )}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
