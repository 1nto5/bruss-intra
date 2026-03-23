"use client";

import { Card, CardContent } from "@/components/ui/card";
import { DateTimeInput } from "@/components/ui/datetime-input";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { FilterActions } from "@/components/ui/filter-actions";
import { FilterField } from "@/components/ui/filter-field";
import { FilterGrid } from "@/components/ui/filter-grid";
import { FilterToggle } from "@/components/ui/filter-toggle";
import { Input } from "@/components/ui/input";
import { ClearableCombobox } from "@/components/clearable-combobox";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Dictionary } from "../lib/dict";
import { DeviationAreaType, DeviationReasonType } from "../lib/types";

export default function TableFilteringAndOptions({
  fetchTime,
  isLogged,
  userEmail,
  hasApprovalRole,
  areaOptions,
  reasonOptions,
  dict,
}: {
  fetchTime: Date;
  isLogged: boolean;
  userEmail?: string;
  hasApprovalRole?: boolean;
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

  const [showOnlyDrafts, setShowOnlyDrafts] = useState(() => {
    return searchParams?.get("status") === "draft";
  });

  const [showOnlyToApprove, setShowOnlyToApprove] = useState(() => {
    return searchParams?.get("toApprove") === "true";
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
    setShowOnlyDrafts(false);
    setShowOnlyToApprove(false);

    if (searchParams?.toString()) {
      setIsPendingSearch(true);
      router.push(pathname || "");
    }
  };

  const handleShowOnlyDraftsChange = (checked: boolean) => {
    setShowOnlyDrafts(checked);
    if (checked) {
      setShowOnlyToApprove(false);
      setStatusFilter("");
    }
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (checked) {
      params.set("status", "draft");
      params.delete("toApprove");
    } else {
      params.delete("status");
    }
    setIsPendingSearch(true);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleShowOnlyToApproveChange = (checked: boolean) => {
    setShowOnlyToApprove(checked);
    if (checked) {
      setShowOnlyDrafts(false);
      setStatusFilter("");
    }
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (checked) {
      params.set("toApprove", "true");
      params.delete("status");
    } else {
      params.delete("toApprove");
    }
    setIsPendingSearch(true);
    router.push(`${pathname}?${params.toString()}`);
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
    showOnlyMine ||
    showOnlyDrafts ||
    showOnlyToApprove,
  );

  const hasUrlParams = Boolean(searchParams?.toString());

  const hasPendingChanges = (() => {
    const urlId = searchParams?.get("id") || "";
    const urlDate = searchParams?.get("date");
    const urlCreatedAt = searchParams?.get("createdAt");
    const urlStatus = searchParams?.get("status") || "";
    const urlArea = searchParams?.get("area") || "";
    const urlReason = searchParams?.get("reason") || "";

    return (
      idFilter !== urlId ||
      (dateFilter?.toISOString() || "") !== (urlDate || "") ||
      (createdAtFilter?.toISOString() || "") !== (urlCreatedAt || "") ||
      statusFilter !== urlStatus ||
      areaFilter !== urlArea ||
      reasonFilter !== urlReason
    );
  })();

  const canSearch = hasActiveFilters || hasPendingChanges || hasUrlParams;

  return (
    <Card className="mt-4">
      <CardContent className="p-4">
        <form onSubmit={handleSearchClick} className="flex flex-col gap-4">
          {isLogged && (
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
              <FilterToggle
                id="only-my-requests"
                checked={showOnlyMine}
                onCheckedChange={handleShowOnlyMineChange}
                label={dict.filters.onlyMy}
              />
              <FilterToggle
                id="only-drafts"
                checked={showOnlyDrafts}
                onCheckedChange={handleShowOnlyDraftsChange}
                label={dict.filters.onlyDrafts}
              />
              {hasApprovalRole && (
                <FilterToggle
                  id="only-to-approve"
                  checked={showOnlyToApprove}
                  onCheckedChange={handleShowOnlyToApproveChange}
                  label={dict.filters.onlyToApprove}
                />
              )}
            </div>
          )}
          <FilterGrid cols={6}>
            <FilterField label={dict.filters.id}>
              <Input
                value={idFilter}
                onChange={(e) => setIdFilter(e.target.value)}
              />
            </FilterField>
            <FilterField label={dict.filters.status}>
              <ClearableCombobox
                value={statusFilter}
                onValueChange={setStatusFilter}
                options={[
                  { value: "in approval", label: dict.table.status.inApproval },
                  { value: "in progress", label: dict.table.status.inProgress },
                  { value: "rejected", label: dict.table.status.rejected },
                  { value: "draft", label: dict.table.status.draft },
                  { value: "closed", label: dict.table.status.closed },
                  { value: "approved", label: dict.table.status.approved },
                  { value: "cancelled", label: dict.table.status.cancelled },
                ]}
                className="w-full"
              />
            </FilterField>
            <FilterField label={dict.filters.area}>
              <ClearableCombobox
                value={areaFilter}
                onValueChange={setAreaFilter}
                options={areaOptions.map((o) => ({
                  value: o.value,
                  label: o.pl,
                }))}
                className="w-full"
              />
            </FilterField>
            <FilterField label={dict.filters.reason}>
              <ClearableCombobox
                value={reasonFilter}
                onValueChange={setReasonFilter}
                options={reasonOptions.map((o) => ({
                  value: o.value,
                  label: o.pl,
                }))}
                className="w-full"
              />
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
            disabled={!canSearch}
            clearLabel={dict.filters.clear}
            searchLabel={dict.filters.search}
          />
        </form>
      </CardContent>
    </Card>
  );
}
