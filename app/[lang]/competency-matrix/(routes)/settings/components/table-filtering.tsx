"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FilterGrid } from "@/components/ui/filter-grid";
import { FilterField } from "@/components/ui/filter-field";
import { FilterActions } from "@/components/ui/filter-actions";
import { MultiSelect } from "@/components/ui/multi-select";
import type { MultiSelectOption } from "@/components/ui/multi-select";
import type { Dictionary } from "../../../lib/dict";

interface EvalPeriodFilteringProps {
  dict: Dictionary;
  typeOptions: MultiSelectOption[];
  fetchTime: Date;
}

export function EvalPeriodFiltering({
  dict,
  typeOptions,
  fetchTime,
}: EvalPeriodFilteringProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setIsPending(false);
  }, [fetchTime]);

  const [typeFilter, setTypeFilter] = useState<string[]>(() => {
    const param = searchParams?.get("type");
    return param
      ? param
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  });

  const hasActiveFilters = typeFilter.length > 0;
  const hasUrlParams = Boolean(searchParams?.toString());

  const hasPendingChanges = (() => {
    const arraysEqual = (a: string[], b: string[]) =>
      JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
    const urlType = searchParams?.get("type")?.split(",").filter(Boolean) || [];
    return !arraysEqual(typeFilter, urlType);
  })();

  const canSearch = hasActiveFilters || hasPendingChanges || hasUrlParams;

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const params = new URLSearchParams();
      if (typeFilter.length > 0) params.set("type", typeFilter.join(","));

      const newUrl = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname || "";

      if (newUrl !== `${pathname}?${searchParams?.toString()}`) {
        setIsPending(true);
        router.push(newUrl);
      }
    },
    [typeFilter, pathname, searchParams, router],
  );

  const handleClear = useCallback(() => {
    setTypeFilter([]);

    if (searchParams?.toString()) {
      setIsPending(true);
      router.push(pathname || "");
    }
  }, [searchParams, pathname, router]);

  return (
    <form onSubmit={handleSearch} className="flex flex-col gap-4">
      <FilterGrid cols={2}>
        <FilterField label={dict.settings.filters.type}>
          <MultiSelect
            options={typeOptions}
            value={typeFilter}
            onValueChange={setTypeFilter}
            placeholder={dict.all}
            searchPlaceholder={dict.search}
            emptyText={dict.noData}
            className="w-full"
          />
        </FilterField>
      </FilterGrid>
      <FilterActions
        onClear={handleClear}
        isPending={isPending}
        disabled={!canSearch}
        clearLabel={dict.cancel}
        searchLabel={dict.search}
      />
    </form>
  );
}
