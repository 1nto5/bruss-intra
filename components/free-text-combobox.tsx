"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

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
  },
  en: {
    placeholder: "select",
    search: "search",
    notFound: "not found",
  },
  de: {
    placeholder: "auswählen",
    search: "suchen",
    notFound: "nicht gefunden",
  },
} as const;

interface FreeTextComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
  modal?: boolean;
  className?: string;
}

export function FreeTextCombobox({
  value,
  onValueChange,
  options,
  modal,
  className,
}: FreeTextComboboxProps) {
  const { lang } = useParams<{ lang: string }>();
  const i18n =
    comboboxI18n[lang as keyof typeof comboboxI18n] ?? comboboxI18n.en;

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  return (
    <Popover open={open} onOpenChange={setOpen} modal={modal}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "w-full justify-between bg-[var(--panel-inset)] shadow-[inset_0_1px_2px_oklch(0.2_0.02_260/0.08)]",
            !value && "opacity-50",
            className,
          )}
        >
          {value || i18n.placeholder}
          <ChevronsUpDown className="shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" side="bottom" align="start">
        <Command>
          <CommandInput
            placeholder={i18n.search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{i18n.notFound}</CommandEmpty>
            {search && (
              <CommandGroup forceMount>
                <CommandItem
                  forceMount
                  value={`__custom::${search}`}
                  onSelect={() => {
                    onValueChange(search);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === search ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {search}
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={(val) => {
                    onValueChange(val);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
