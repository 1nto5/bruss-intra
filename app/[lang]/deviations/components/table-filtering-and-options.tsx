"use client";

import { Card, CardContent } from "@/components/ui/card";
import { DateTimeInput } from "@/components/ui/datetime-input";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { FilterActions } from "@/components/ui/filter-actions";
import { FilterField } from "@/components/ui/filter-field";
import { FilterGrid } from "@/components/ui/filter-grid";
import { FilterToggle } from "@/components/ui/filter-toggle";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Dictionary } from "../lib/dict";
import { DeviationAreaType, DeviationReasonType } from "../lib/types";

export default function TableFilteringAndOptions({
  fetchTime,
  isLogged,
  userEmail,
  areaOptions,
  reasonOptions,
  dict,
}: {
  fetchTime: Date;
  isLogged: boolean;
  userEmail?: string;
  areaOptions: DeviationAreaType[];
  reasonOptions: DeviationReasonType[];
  dict: Dictionary;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isPendingSearch, setIsPendingSearch] = useState(false);

  useEffect(() => {
    setIsPendingSearch(false);
  }, [fetchTime]);

  const [showOnlyMine, setShowOnlyMine] = useState(() => {
    const owner = searchParams?.get("owner");
    return owner === userEmail;
  });

  const [dateFilter, setDateFilter] = useState(() => {
    const dateParam = searchParams?.get("date");
    return dateParam ? new Date(dateParam) : undefined;
  });
  const [createdAtFilter, setRequestedAtFilter] = useState(() => {
    const createdAtParam = searchParams?.get("createdAt");
    return createdAtParam ? new Date(createdAtParam) : undefined;
  });
  const [statusFilter, setStatusFilter] = useState(
    searchParams?.get("status") || "",
  );
  const [areaFilter, setAreaFilter] = useState(searchParams?.get("area") || "");
  const [reasonFilter, setReasonFilter] = useState(
    searchParams?.get("reason") || "",
  );
  const [idFilter, setIdFilter] = useState(searchParams?.get("id") || "");

  const buildSearchParams = (currentState: {
    date?: Date;
    createdAt?: Date;
    status: string;
    area: string;
    reason: string;
    id: string;
    owner?: string | null;
  }) => {
    const params = new URLSearchParams();
    if (currentState.date) params.set("date", currentState.date.toISOString());
    if (currentState.createdAt)
      params.set("createdAt", currentState.createdAt.toISOString());
    if (currentState.status) params.set("status", currentState.status);
    if (currentState.area) params.set("area", currentState.area);
    if (currentState.reason) params.set("reason", currentState.reason);
    if (currentState.id) params.set("id", currentState.id);
    if (showOnlyMine && userEmail) params.set("owner", userEmail);
    return params;
  };

  const handleClearFilters = () => {
    setDateFilter(undefined);
    setRequestedAtFilter(undefined);
    setStatusFilter("");
    setAreaFilter("");
    setReasonFilter("");
    setIdFilter("");
    setShowOnlyMine(false);

    if (searchParams?.toString()) {
      setIsPendingSearch(true);
      router.push(pathname || "");
    }
  };

  const handleSearchClick = (e: React.FormEvent) => {
    e.preventDefault();
    const params = buildSearchParams({
      date: dateFilter,
      createdAt: createdAtFilter,
      status: statusFilter,
      area: areaFilter,
      reason: reasonFilter,
      id: idFilter,
    });

    const newUrl = `${pathname}?${params.toString()}`;

    if (newUrl !== `${pathname}?${searchParams?.toString()}`) {
      setIsPendingSearch(true);
      router.push(newUrl);
    }
  };

  const handleShowOnlyMineChange = (checked: boolean) => {
    setShowOnlyMine(checked);
    const params = buildSearchParams({
      date: dateFilter,
      createdAt: createdAtFilter,
      status: statusFilter,
      area: areaFilter,
      reason: reasonFilter,
      id: idFilter,
      owner: checked ? userEmail : null,
    });

    if (checked && userEmail) {
      params.set("owner", userEmail);
    } else {
      params.delete("owner");
    }

    const newUrl = `${pathname}?${params.toString()}`;
    setIsPendingSearch(true);
    router.push(newUrl);
  };

  const hasActiveFilters = Boolean(
    idFilter ||
      dateFilter ||
      createdAtFilter ||
      statusFilter ||
      areaFilter ||
      reasonFilter ||
      showOnlyMine,
  );

  return (
    <Card className="mt-4">
      <CardContent className="p-4">
        <form onSubmit={handleSearchClick} className="flex flex-col gap-4">
          {isLogged && (
            <FilterToggle
              id="only-my-requests"
              checked={showOnlyMine}
              onCheckedChange={handleShowOnlyMineChange}
              label={dict.filters.onlyMy}
            />
          )}
          <FilterGrid cols={6}>
            <FilterField label={dict.filters.id}>
              <Input
                value={idFilter}
                onChange={(e) => setIdFilter(e.target.value)}
                placeholder="1/2025"
              />
            </FilterField>
            <FilterField label={dict.filters.status}>
              <Select onValueChange={setStatusFilter} value={statusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={dict.filters.select} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in approval">
                    {dict.table.status.inApproval}
                  </SelectItem>
                  <SelectItem value="in progress">
                    {dict.table.status.inProgress}
                  </SelectItem>
                  <SelectItem value="rejected">
                    {dict.table.status.rejected}
                  </SelectItem>
                  <SelectItem value="draft">
                    {dict.table.status.draft}
                  </SelectItem>
                  <SelectItem value="closed">
                    {dict.table.status.closed}
                  </SelectItem>
                  <SelectItem value="approved">
                    {dict.table.status.approved}
                  </SelectItem>
                  <SelectItem value="cancelled">
                    {dict.table.status.cancelled}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label={dict.filters.area}>
              <Select onValueChange={setAreaFilter} value={areaFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={dict.filters.select} />
                </SelectTrigger>
                <SelectContent>
                  {areaOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.pl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label={dict.filters.reason}>
              <Select onValueChange={setReasonFilter} value={reasonFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={dict.filters.select} />
                </SelectTrigger>
                <SelectContent>
                  {reasonOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.pl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label={dict.filters.deviationDate}>
              <DateTimePicker
                value={dateFilter}
                onChange={setDateFilter}
                hideTime
                renderTrigger={({ value, setOpen, open }) => (
                  <DateTimeInput
                    value={value}
                    onChange={(x) => !open && setDateFilter(x)}
                    format="dd/MM/yyyy"
                    disabled={open}
                    onCalendarClick={() => setOpen(!open)}
                    className="w-full"
                  />
                )}
              />
            </FilterField>
            <FilterField label={dict.filters.createdDate}>
              <DateTimePicker
                value={createdAtFilter}
                onChange={setRequestedAtFilter}
                hideTime
                renderTrigger={({ value, setOpen, open }) => (
                  <DateTimeInput
                    value={value}
                    onChange={(x) => !open && setRequestedAtFilter(x)}
                    format="dd/MM/yyyy"
                    disabled={open}
                    onCalendarClick={() => setOpen(!open)}
                    className="w-full"
                  />
                )}
              />
            </FilterField>
          </FilterGrid>

          <FilterActions
            onClear={handleClearFilters}
            isPending={isPendingSearch}
            disabled={!hasActiveFilters}
            clearLabel={dict.filters.clear}
            searchLabel={dict.filters.search}
          />
        </form>
      </CardContent>
    </Card>
  );
}
