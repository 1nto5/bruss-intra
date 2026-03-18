"use client";

import { DateTimeInput } from "@/components/ui/datetime-input";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { FilterActions } from "@/components/ui/filter-actions";
import { FilterCard, FilterCardContent } from "@/components/ui/filter-card";
import { FilterField } from "@/components/ui/filter-field";
import { FilterGrid } from "@/components/ui/filter-grid";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CORRECTION_KINDS, CORRECTION_STATUSES } from "../lib/constants";
import type { Dictionary } from "../lib/dict";
import type { QuarryType, WarehouseType } from "../lib/types";

export default function TableFilteringAndOptions({
  dict,
  quarries,
  warehouses,
  fetchTime,
}: {
  dict: Dictionary;
  quarries: QuarryType[];
  warehouses: WarehouseType[];
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

  const [createdBy, setCreatedBy] = useState<string>(
    searchParams.get("createdBy") || "",
  );

  const [article, setArticle] = useState<string>(
    searchParams.get("article") || "",
  );

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

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (statusFilter.length > 0) params.set("status", statusFilter.join(","));
    if (typeFilter.length > 0) params.set("type", typeFilter.join(","));
    if (dateFrom) params.set("dateFrom", dateFrom.toISOString());
    if (dateTo) params.set("dateTo", dateTo.toISOString());
    if (createdBy) params.set("createdBy", createdBy);
    if (article) params.set("article", article);
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
    setCreatedBy("");
    setArticle("");
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
    createdBy !== "" ||
    article !== "" ||
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
      createdBy !== (searchParams.get("createdBy") || "") ||
      article !== (searchParams.get("article") || "") ||
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
              placeholder={dict.common.select}
              searchPlaceholder={dict.common.search}
              emptyText={dict.filters.notFound}
              clearLabel={dict.common.clear}
              selectedLabel={dict.filters.selected}
              className="w-full"
              options={statusOptions}
            />
          </FilterField>
          <FilterField label={dict.filters.type}>
            <MultiSelect
              value={typeFilter}
              onValueChange={setTypeFilter}
              placeholder={dict.common.select}
              searchPlaceholder={dict.common.search}
              emptyText={dict.filters.notFound}
              clearLabel={dict.common.clear}
              selectedLabel={dict.filters.selected}
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
            <Input
              placeholder="email@bruss-group.com"
              value={createdBy}
              onChange={(e) => setCreatedBy(e.target.value)}
              className="w-full"
            />
          </FilterField>
          <FilterField label={dict.filters.article}>
            <Input
              placeholder="123456"
              value={article}
              onChange={(e) => setArticle(e.target.value)}
              className="w-full"
            />
          </FilterField>
          <FilterField label={dict.filters.quarry}>
            <MultiSelect
              value={quarryFilter}
              onValueChange={setQuarryFilter}
              placeholder={dict.common.select}
              searchPlaceholder={dict.common.search}
              emptyText={dict.filters.notFound}
              clearLabel={dict.common.clear}
              selectedLabel={dict.filters.selected}
              className="w-full"
              options={quarryOptions}
            />
          </FilterField>
          <FilterField label={dict.filters.warehouse}>
            <MultiSelect
              value={warehouseFilter}
              onValueChange={setWarehouseFilter}
              placeholder={dict.common.select}
              searchPlaceholder={dict.common.search}
              emptyText={dict.filters.notFound}
              clearLabel={dict.common.clear}
              selectedLabel={dict.filters.selected}
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
