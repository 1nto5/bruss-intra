'use client';

import { Check, CircleX, ChevronsUpDown } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils/cn';

interface ClearableComboboxProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  notFoundText?: string;
  clearLabel: string;
  options: Array<{ value: string; label: string }>;
  className?: string;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ClearableCombobox({
  value,
  onValueChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  notFoundText = 'Not found',
  clearLabel,
  options,
  className,
  disabled,
  open,
  onOpenChange,
}: ClearableComboboxProps) {
  const selectedOption = options.find((opt) => opt.value === value);
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

  const handleSelect = (currentValue: string) => {
    if (currentValue === '__clear__') {
      onValueChange('');
    } else {
      onValueChange(currentValue);
    }
    onOpenChange?.(false);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          disabled={disabled}
          className={cn(
            'h-10 justify-between bg-[var(--panel-inset)] shadow-[inset_0_1px_2px_oklch(0.2_0.02_260/0.08)]',
            !value && 'opacity-50',
            className
          )}
        >
          {selectedOption?.label || placeholder}
          <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[var(--radix-popover-trigger-width)] p-0' side='bottom' align='start'>
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{notFoundText}</CommandEmpty>
            <CommandGroup>
              {showClear && (
                <CommandItem
                  key='__clear__'
                  value='__clear__'
                  onSelect={handleSelect}
                  className='!bg-red-100 !text-red-600 hover:!bg-red-200 aria-selected:!bg-red-200 dark:!bg-red-900/20 dark:!text-red-400 dark:hover:!bg-red-900/30 dark:aria-selected:!bg-red-900/30'
                >
                  <CircleX className='mr-2 h-4 w-4' />
                  {clearLabel}
                </CommandItem>
              )}
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={handleSelect}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
