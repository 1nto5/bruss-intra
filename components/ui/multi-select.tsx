'use client';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils/cn';
import { Check, ChevronsUpDown, CircleX } from 'lucide-react';
import { useState } from 'react';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  clearLabel?: string;
  selectedLabel?: string; // e.g., "items selected" or "pozycji wybranych"
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  value,
  onValueChange,
  placeholder = 'Select items...',
  searchPlaceholder = 'Search...',
  emptyText = 'No items found.',
  clearLabel = 'Clear all',
  selectedLabel = 'items selected',
  className,
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const handleSelect = (selectedValue: string) => {
    const isSelected = value.includes(selectedValue);
    if (isSelected) {
      onValueChange(value.filter((item) => item !== selectedValue));
    } else {
      onValueChange([...value, selectedValue]);
    }
    setInputValue('');
  };

  const handleClearAll = () => {
    onValueChange([]);
    setOpen(false);
  };

  const getDisplayText = () => {
    if (value.length === 0) return placeholder;
    if (value.length === 1) {
      const selectedOption = options.find(
        (option) => option.value === value[0],
      );
      return selectedOption?.label || value[0];
    }
    return `${selectedLabel}: ${value.length}`;
  };

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between',
            value.length === 0 && 'opacity-50',
            className,
          )}
        >
          <span className='truncate'>{getDisplayText()}</span>
          <ChevronsUpDown className='shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[300px] p-0' side='bottom' align='start'>
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {value.length > 0 && (
                <CommandItem
                  key='clear-all'
                  onSelect={handleClearAll}
                  className='bg-destructive/10 text-destructive hover:bg-destructive/20 aria-selected:bg-destructive/20'
                >
                  <CircleX />
                  {clearLabel}
                </CommandItem>
              )}
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.value}${option.label}`}
                  onSelect={() => handleSelect(option.value)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value.includes(option.value)
                        ? 'opacity-100'
                        : 'opacity-0',
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
