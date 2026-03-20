"use client";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils/cn";
import { Check, ChevronsUpDown, CircleX } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

const multiSelectI18n = {
  pl: {
    placeholder: "wybierz",
    search: "szukaj",
    notFound: "nie znaleziono",
    clear: "wyczysc",
    selected: "wybranych",
  },
  en: {
    placeholder: "select",
    search: "search",
    notFound: "not found",
    clear: "clear",
    selected: "selected",
  },
  de: {
    placeholder: "auswahlen",
    search: "suchen",
    notFound: "nicht gefunden",
    clear: "loschen",
    selected: "ausgewahlt",
  },
} as const;

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onValueChange: (value: string[]) => void;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  value,
  onValueChange,
  className,
  disabled = false,
}: MultiSelectProps) {
  const { lang } = useParams<{ lang: string }>();
  const i18n =
    multiSelectI18n[lang as keyof typeof multiSelectI18n] ??
    multiSelectI18n.en;

  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const handleSelect = (selectedValue: string) => {
    const isSelected = value.includes(selectedValue);
    if (isSelected) {
      onValueChange(value.filter((item) => item !== selectedValue));
    } else {
      onValueChange([...value, selectedValue]);
    }
    setInputValue("");
  };

  const handleClearAll = () => {
    onValueChange([]);
    setOpen(false);
  };

  const getDisplayText = () => {
    if (value.length === 0) return i18n.placeholder;
    if (value.length === 1) {
      const selectedOption = options.find(
        (option) => option.value === value[0],
      );
      return selectedOption?.label || value[0];
    }
    return `${i18n.selected}: ${value.length}`;
  };

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-between bg-[var(--panel-inset)] shadow-[inset_0_1px_2px_oklch(0.2_0.02_260/0.08)]",
            value.length === 0 && "opacity-50",
            className,
          )}
        >
          <span className="truncate">{getDisplayText()}</span>
          <ChevronsUpDown className="shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" side="bottom" align="start">
        <Command>
          {options.length > 4 && (
            <CommandInput
              placeholder={i18n.search}
              value={inputValue}
              onValueChange={setInputValue}
            />
          )}
          <CommandList>
            <CommandEmpty>{i18n.notFound}</CommandEmpty>
            <CommandGroup>
              {value.length > 0 && (
                <CommandItem
                  key="clear-all"
                  onSelect={handleClearAll}
                  className="bg-destructive/10 text-destructive hover:bg-destructive/20 aria-selected:bg-destructive/20"
                >
                  <CircleX className="mr-2 h-4 w-4" />
                  {i18n.clear}
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
                      "mr-2 h-4 w-4",
                      value.includes(option.value)
                        ? "opacity-100"
                        : "opacity-0",
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
