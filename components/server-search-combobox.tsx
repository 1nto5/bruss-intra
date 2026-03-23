"use client";

import { CircleX, ChevronsUpDown, Loader2 } from "lucide-react";
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
    minChars: "wpisz min. {n} znaki aby wyszukać",
  },
  en: {
    placeholder: "select",
    search: "search",
    notFound: "not found",
    clear: "clear",
    minChars: "type at least {n} characters to search",
  },
  de: {
    placeholder: "auswählen",
    search: "suchen",
    notFound: "nicht gefunden",
    clear: "löschen",
    minChars: "min. {n} Zeichen eingeben um zu suchen",
  },
} as const;

interface ServerSearchComboboxProps<T> {
  displayValue?: string;
  onSelect: (item: T | null) => void;
  fetchResults: (query: string) => Promise<T[]>;
  renderItem: (item: T) => React.ReactNode;
  getKey: (item: T) => string;
  minChars?: number;
  debounceMs?: number;
  className?: string;
  disabled?: boolean;
}

export function ServerSearchCombobox<T>({
  displayValue,
  onSelect,
  fetchResults,
  renderItem,
  getKey,
  minChars = 2,
  debounceMs = 300,
  className,
  disabled,
}: ServerSearchComboboxProps<T>) {
  const { lang } = useParams<{ lang: string }>();
  const i18n =
    comboboxI18n[lang as keyof typeof comboboxI18n] ?? comboboxI18n.en;

  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [results, setResults] = React.useState<T[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSearchChange = React.useCallback(
    (value: string) => {
      setSearchQuery(value);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (value.length < minChars) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const data = await fetchResults(value);
          setResults(data);
        } catch {
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      }, debounceMs);
    },
    [fetchResults, minChars, debounceMs],
  );

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleSelect = (item: T | null) => {
    onSelect(item);
    setOpen(false);
    setSearchQuery("");
    setResults([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            "h-10 justify-between bg-[var(--panel-inset)] shadow-[inset_0_1px_2px_oklch(0.2_0.02_260/0.08)]",
            !displayValue && "opacity-50",
            className,
          )}
        >
          <span className="truncate">
            {displayValue || i18n.placeholder}
          </span>
          <ChevronsUpDown className="shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        side="bottom"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={i18n.search}
            value={searchQuery}
            onValueChange={handleSearchChange}
          />
          <CommandList>
            {displayValue && (
              <CommandGroup>
                <CommandItem
                  key="__clear__"
                  value="__clear__"
                  onSelect={() => handleSelect(null)}
                  className="bg-destructive/10 text-destructive hover:bg-destructive/20 aria-selected:bg-destructive/20"
                >
                  <CircleX className="mr-2 h-4 w-4" />
                  {i18n.clear}
                </CommandItem>
              </CommandGroup>
            )}
            {searchQuery.length < minChars ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {i18n.minChars.replace("{n}", String(minChars))}
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 ? (
              <CommandEmpty>{i18n.notFound}</CommandEmpty>
            ) : null}
            {results.length > 0 && (
              <CommandGroup>
                {results.map((item) => (
                  <CommandItem
                    key={getKey(item)}
                    value={getKey(item)}
                    onSelect={() => handleSelect(item)}
                  >
                    {renderItem(item)}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
