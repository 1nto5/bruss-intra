"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FilterGrid } from "@/components/ui/filter-grid";
import { FilterField } from "@/components/ui/filter-field";
import { FilterActions } from "@/components/ui/filter-actions";
import { Input } from "@/components/ui/input";
import type { Dictionary } from "../../../../lib/dict";

interface CertTypeFilteringProps {
  dict: Dictionary;
  fetchTime: Date;
}

export function CertTypeFiltering({ dict, fetchTime }: CertTypeFilteringProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setIsPending(false);
  }, [fetchTime]);

  const [nameFilter, setNameFilter] = useState(searchParams?.get("name") || "");

  const hasActiveFilters = nameFilter.length > 0;
  const hasUrlParams = Boolean(searchParams?.toString());

  const hasPendingChanges = (() => {
    const urlName = searchParams?.get("name") || "";
    return nameFilter !== urlName;
  })();

  const canSearch = hasActiveFilters || hasPendingChanges || hasUrlParams;

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const params = new URLSearchParams();
      if (nameFilter) params.set("name", nameFilter);

      const newUrl = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname || "";

      if (newUrl !== `${pathname}?${searchParams?.toString()}`) {
        setIsPending(true);
        router.push(newUrl);
      }
    },
    [nameFilter, pathname, searchParams, router],
  );

  const handleClear = useCallback(() => {
    setNameFilter("");

    if (searchParams?.toString()) {
      setIsPending(true);
      router.push(pathname || "");
    }
  }, [searchParams, pathname, router]);

  return (
    <form onSubmit={handleSearch} className="flex flex-col gap-4">
      <FilterGrid cols={2}>
        <FilterField label={dict.settings.filters.name}>
          <Input
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
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
