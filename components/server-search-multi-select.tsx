"use client";

import { Check, CircleX, ChevronsUpDown, Loader2 } from "lucide-react";
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

const i18nMap = {
  pl: {
    placeholder: "wybierz",
    search: "szukaj",
    notFound: "nie znaleziono",
    clear: "wyczyść",
    selected: "wybranych",
    minChars: "wpisz min. {n} znaki aby wyszukać",
  },
  en: {
    placeholder: "select",
    search: "search",
    notFound: "not found",
    clear: "clear",
    selected: "selected",
    minChars: "type at least {n} characters to search",
  },
  de: {
    placeholder: "auswählen",
    search: "suchen",
    notFound: "nicht gefunden",
    clear: "löschen",
    selected: "ausgewählt",
    minChars: "min. {n} Zeichen eingeben um zu suchen",
  },
} as const;

interface ServerSearchMultiSelectProps<T> {
  selected: T[];
  onSelectedChange: (items: T[]) => void;
  fetchResults: (query: string) => Promise<T[]>;
  renderItem: (item: T) => React.ReactNode;
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  minChars?: number;
  debounceMs?: number;
  className?: string;
  disabled?: boolean;
}

export function ServerSearchMultiSelect<T>({
  selected,
  onSelectedChange,
  fetchResults,
  renderItem,
  getKey,
  getLabel,
  minChars = 2,
  debounceMs = 300,
  className,
  disabled,
}: ServerSearchMultiSelectProps<T>) {
  const { lang } = useParams<{ lang: string }>();
  const i18n = i18nMap[lang as keyof typeof i18nMap] ?? i18nMap.en;

  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [results, setResults] = React.useState<T[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  const selectedKeys = React.useMemo(
    () => new Set(selected.map(getKey)),
    [selected, getKey],
  );

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

  const handleToggle = (item: T) => {
    const key = getKey(item);
    if (selectedKeys.has(key)) {
      onSelectedChange(selected.filter((s) => getKey(s) !== key));
    } else {
      onSelectedChange([...selected, item]);
    }
  };

  const handleClearAll = () => {
    onSelectedChange([]);
    setOpen(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearchQuery("");
      setResults([]);
    }
  };

  const getDisplayText = () => {
    if (selected.length === 0) return i18n.placeholder;
    if (selected.length === 1) return getLabel(selected[0]);
    return `${i18n.selected}: ${selected.length}`;
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-10 justify-between bg-[var(--panel-inset)] shadow-[inset_0_1px_2px_oklch(0.2_0.02_260/0.08)]",
            selected.length === 0 && "opacity-50",
            className,
          )}
        >
          <span className="truncate">{getDisplayText()}</span>
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
            {selected.length > 0 && (
              <CommandGroup>
                <CommandItem
                  key="__clear__"
                  value="__clear__"
                  onSelect={handleClearAll}
                  className="bg-destructive/10 text-destructive hover:bg-destructive/20 aria-selected:bg-destructive/20"
                >
                  <CircleX className="mr-2 h-4 w-4" />
                  {i18n.clear}
                </CommandItem>
              </CommandGroup>
            )}
            {selected.length > 0 && (
              <CommandGroup>
                {selected.map((item) => (
                  <CommandItem
                    key={`selected-${getKey(item)}`}
                    value={`selected-${getKey(item)}`}
                    onSelect={() => handleToggle(item)}
                  >
                    <Check className="mr-2 h-4 w-4 opacity-100" />
                    {renderItem(item)}
                  </CommandItem>
                ))}
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
                {results
                  .filter((item) => !selectedKeys.has(getKey(item)))
                  .map((item) => (
                    <CommandItem
                      key={getKey(item)}
                      value={getKey(item)}
                      onSelect={() => handleToggle(item)}
                    >
                      <Check className="mr-2 h-4 w-4 opacity-0" />
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
