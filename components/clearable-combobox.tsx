"use client";

import { Check, CircleX, ChevronsUpDown } from "lucide-react";
import { useParams } from "next/navigation";
import * as React from "react";

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

const comboboxI18n = {
  pl: {
    placeholder: "wybierz",
    search: "szukaj",
    notFound: "nie znaleziono",
    clear: "wyczyść",
  },
  en: {
    placeholder: "select",
    search: "search",
    notFound: "not found",
    clear: "clear",
  },
  de: {
    placeholder: "auswählen",
    search: "suchen",
    notFound: "nicht gefunden",
    clear: "löschen",
  },
} as const;

interface ClearableComboboxProps {
  value?: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
}

export function ClearableCombobox({
  value,
  onValueChange,
  options,
  className,
  disabled,
  open,
  onOpenChange,
  modal,
}: ClearableComboboxProps) {
  const { lang } = useParams<{ lang: string }>();
  const i18n =
    comboboxI18n[lang as keyof typeof comboboxI18n] ?? comboboxI18n.en;

  const [internalOpen, setInternalOpen] = React.useState(false);
  const isOpen = open ?? internalOpen;
  const setIsOpen = onOpenChange ?? setInternalOpen;

  const sortedOptions = React.useMemo(
    () => [...options].sort((a, b) => a.label.localeCompare(b.label)),
    [options],
  );

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
    if (currentValue === "__clear__") {
      onValueChange("");
    } else {
      onValueChange(currentValue);
    }
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} modal={modal}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            "h-10 justify-between bg-[var(--panel-inset)] shadow-[inset_0_1px_2px_oklch(0.2_0.02_260/0.08)]",
            !value && "opacity-50",
            className,
          )}
        >
          {selectedOption?.label || i18n.placeholder}
          <ChevronsUpDown className="shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        side="bottom"
        align="start"
      >
        <Command>
          {options.length > 4 && (
            <CommandInput placeholder={i18n.search} />
          )}
          <CommandList>
            <CommandEmpty>{i18n.notFound}</CommandEmpty>
            <CommandGroup>
              {showClear && (
                <CommandItem
                  key="__clear__"
                  value="__clear__"
                  onSelect={handleSelect}
                  className="bg-destructive/10 text-destructive hover:bg-destructive/20 aria-selected:bg-destructive/20"
                >
                  <CircleX className="mr-2 h-4 w-4" />
                  {i18n.clear}
                </CommandItem>
              )}
              {sortedOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  keywords={[option.label]}
                  onSelect={handleSelect}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0",
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
