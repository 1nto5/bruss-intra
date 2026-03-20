"use client";

import { DateTimeInput } from "@/components/ui/datetime-input";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { FilterActions } from "@/components/ui/filter-actions";
import { FilterCard, FilterCardContent } from "@/components/ui/filter-card";
import { FilterField } from "@/components/ui/filter-field";
import { FilterGrid } from "@/components/ui/filter-grid";
import { MultiSelect } from "@/components/ui/multi-select";
import { ServerSearchMultiSelect } from "@/components/server-search-multi-select";
import type { UsersListType } from "@/lib/types/user";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CORRECTION_KINDS, CORRECTION_STATUSES } from "../lib/constants";
import type { Dictionary } from "../lib/dict";
import type { ArticleType, QuarryType, WarehouseType } from "../lib/types";

export default function TableFilteringAndOptions({
  dict,
  quarries,
  warehouses,
  users,
  fetchTime,
}: {
  dict: Dictionary;
  quarries: QuarryType[];
  warehouses: WarehouseType[];
  users: UsersListType;
  fetchTime: Date;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setIsSearching(false);
  }, [fetchTime]);

  const [statusFilter, setStatusFilter] = useState<string[]>(() => {
    const param = searchParams?.get("status");
    return param ? param.split(",") : [];
  });

  const [typeFilter, setTypeFilter] = useState<string[]>(() => {
    const param = searchParams?.get("type");
    return param ? param.split(",") : [];
  });

  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    searchParams.get("dateFrom")
      ? new Date(searchParams.get("dateFrom")!)
      : undefined,
  );

  const [dateTo, setDateTo] = useState<Date | undefined>(
    searchParams.get("dateTo")
      ? new Date(searchParams.get("dateTo")!)
      : undefined,
  );

  const [createdBy, setCreatedBy] = useState<string[]>(() => {
    const param = searchParams?.get("createdBy");
    return param ? param.split(",") : [];
  });

  const [selectedArticles, setSelectedArticles] = useState<ArticleType[]>(
    () => {
      const param = searchParams?.get("article");
      if (!param) return [];
      return param.split(",").map((articleNumber) => ({
        _id: "",
        articleNumber,
        articleName: articleNumber,
        unitPrice: 0,
        active: true,
        createdAt: "",
        createdBy: "",
      }));
    },
  );

  const fetchArticles = useCallback(async (query: string) => {
    const res = await fetch(
      `/api/warehouse-corrections/articles?q=${encodeURIComponent(query)}`,
    );
    if (!res.ok) return [];
    return res.json() as Promise<ArticleType[]>;
  }, []);

  const [quarryFilter, setQuarryFilter] = useState<string[]>(() => {
    const param = searchParams?.get("quarry");
    return param ? param.split(",") : [];
  });

  const [warehouseFilter, setWarehouseFilter] = useState<string[]>(() => {
    const param = searchParams?.get("warehouse");
    return param ? param.split(",") : [];
  });

  const statusOptions = CORRECTION_STATUSES.map((s) => ({
    value: s,
    label: dict.status[s as keyof typeof dict.status],
  }));

  const typeOptions = CORRECTION_KINDS.map((t) => ({
    value: t,
    label: dict.types[t as keyof typeof dict.types],
  }));

  const quarryOptions = quarries.map((q) => ({
    value: q.value,
    label: q.label,
  }));

  const warehouseOptions = warehouses.map((w) => ({
    value: w.value,
    label: w.label,
  }));

  const userOptions = users.map((u) => ({
    value: u.email,
    label: u.name,
  }));

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (statusFilter.length > 0) params.set("status", statusFilter.join(","));
    if (typeFilter.length > 0) params.set("type", typeFilter.join(","));
    if (dateFrom) params.set("dateFrom", dateFrom.toISOString());
    if (dateTo) params.set("dateTo", dateTo.toISOString());
    if (createdBy.length > 0) params.set("createdBy", createdBy.join(","));
    if (selectedArticles.length > 0)
      params.set(
        "article",
        selectedArticles.map((a) => a.articleNumber).join(","),
      );
    if (quarryFilter.length > 0)
      params.set("quarry", quarryFilter.join(","));
    if (warehouseFilter.length > 0)
      params.set("warehouse", warehouseFilter.join(","));

    const newUrl = `${pathname}?${params.toString()}`;
    setIsSearching(true);
    router.push(newUrl);
  };

  const clearFilters = () => {
    setStatusFilter([]);
    setTypeFilter([]);
    setDateFrom(undefined);
    setDateTo(undefined);
    setCreatedBy([]);
    setSelectedArticles([]);
    setQuarryFilter([]);
    setWarehouseFilter([]);
    if (searchParams?.toString()) {
      setIsSearching(true);
      router.push(pathname || "");
    }
  };

  const hasActiveFilters =
    statusFilter.length > 0 ||
    typeFilter.length > 0 ||
    dateFrom !== undefined ||
    dateTo !== undefined ||
    createdBy.length > 0 ||
    selectedArticles.length > 0 ||
    quarryFilter.length > 0 ||
    warehouseFilter.length > 0;

  const hasUrlParams = Boolean(searchParams?.toString());

  const hasPendingChanges = (() => {
    const arraysEqual = (a: string[], b: string[]) =>
      JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

    return (
      !arraysEqual(
        statusFilter,
        searchParams.get("status")?.split(",") || [],
      ) ||
      !arraysEqual(typeFilter, searchParams.get("type")?.split(",") || []) ||
      (dateFrom?.toISOString() || "") !==
        (searchParams.get("dateFrom") || "") ||
      (dateTo?.toISOString() || "") !== (searchParams.get("dateTo") || "") ||
      !arraysEqual(
        createdBy,
        searchParams.get("createdBy")?.split(",") || [],
      ) ||
      !arraysEqual(
        selectedArticles.map((a) => a.articleNumber),
        searchParams.get("article")?.split(",") || [],
      ) ||
      !arraysEqual(
        quarryFilter,
        searchParams.get("quarry")?.split(",") || [],
      ) ||
      !arraysEqual(
        warehouseFilter,
        searchParams.get("warehouse")?.split(",") || [],
      )
    );
  })();

  const canSearch = hasActiveFilters || hasPendingChanges || hasUrlParams;

  return (
    <FilterCard>
      <FilterCardContent
        className="pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          applyFilters();
        }}
      >
        <FilterGrid cols={4}>
          <FilterField label={dict.filters.status}>
            <MultiSelect
              value={statusFilter}
              onValueChange={setStatusFilter}
              className="w-full"
              options={statusOptions}
            />
          </FilterField>
          <FilterField label={dict.filters.type}>
            <MultiSelect
              value={typeFilter}
              onValueChange={setTypeFilter}
              className="w-full"
              options={typeOptions}
            />
          </FilterField>
          <FilterField label={dict.filters.dateFrom}>
            <DateTimePicker
              value={dateFrom}
              onChange={setDateFrom}
              hideTime
              renderTrigger={({ value, setOpen, open }) => (
                <DateTimeInput
                  value={value}
                  onChange={(x) => !open && setDateFrom(x)}
                  format="dd/MM/yyyy"
                  disabled={open}
                  onCalendarClick={() => setOpen(!open)}
                  className="w-full"
                />
              )}
            />
          </FilterField>
          <FilterField label={dict.filters.dateTo}>
            <DateTimePicker
              value={dateTo}
              onChange={setDateTo}
              hideTime
              renderTrigger={({ value, setOpen, open }) => (
                <DateTimeInput
                  value={value}
                  onChange={(x) => !open && setDateTo(x)}
                  format="dd/MM/yyyy"
                  disabled={open}
                  onCalendarClick={() => setOpen(!open)}
                  className="w-full"
                />
              )}
            />
          </FilterField>
        </FilterGrid>

        <FilterGrid cols={4}>
          <FilterField label={dict.filters.createdBy}>
            <MultiSelect
              value={createdBy}
              onValueChange={setCreatedBy}
              className="w-full"
              options={userOptions}
            />
          </FilterField>
          <FilterField label={dict.filters.article}>
            <ServerSearchMultiSelect<ArticleType>
              selected={selectedArticles}
              onSelectedChange={setSelectedArticles}
              fetchResults={fetchArticles}
              renderItem={(a) => (
                <span>
                  <span className="font-medium">{a.articleNumber}</span>
                  {" - "}
                  {a.articleName}
                </span>
              )}
              getKey={(a) => a.articleNumber}
              getLabel={(a) => `${a.articleNumber} - ${a.articleName}`}
              className="w-full"
            />
          </FilterField>
          <FilterField label={dict.filters.quarry}>
            <MultiSelect
              value={quarryFilter}
              onValueChange={setQuarryFilter}
              className="w-full"
              options={quarryOptions}
            />
          </FilterField>
          <FilterField label={dict.filters.warehouse}>
            <MultiSelect
              value={warehouseFilter}
              onValueChange={setWarehouseFilter}
              className="w-full"
              options={warehouseOptions}
            />
          </FilterField>
        </FilterGrid>

        <FilterActions
          onClear={clearFilters}
          isPending={isSearching}
          disabled={!canSearch}
          clearLabel={dict.common.clear}
          searchLabel={dict.common.search}
        />
      </FilterCardContent>
    </FilterCard>
  );
}
