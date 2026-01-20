"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DateTimeInput } from "@/components/ui/datetime-input";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CircleX, Loader, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { revalidateProductionOvertime as revalidate } from "../actions";
import { Dictionary } from "../lib/dict";

export default function TableFilteringAndOptions({
  fetchTime,
  isGroupLeader,
  isLogged,
  userEmail,
  dict,
}: {
  fetchTime: Date;
  isGroupLeader: boolean;
  isLogged: boolean;
  userEmail?: string;
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
    const requestedBy = searchParams?.get("requestedBy");
    return requestedBy === userEmail;
  });

  const [showOnlyResponsible, setShowOnlyResponsible] = useState(() => {
    const responsibleEmployee = searchParams?.get("responsibleEmployee");
    return responsibleEmployee === userEmail;
  });

  const [dateFilter, setDateFilter] = useState(() => {
    const dateParam = searchParams?.get("date");
    return dateParam ? new Date(dateParam) : undefined;
  });
  const [requestedAtFilter, setRequestedAtFilter] = useState(() => {
    const requestedAtFilterParam = searchParams?.get("requestedAtFilter");
    return requestedAtFilterParam
      ? new Date(requestedAtFilterParam)
      : undefined;
  });
  const [statusFilter, setStatusFilter] = useState(
    searchParams?.get("status") || "",
  );

  const handleClearFilters = () => {
    setDateFilter(undefined);
    setRequestedAtFilter(undefined);
    setStatusFilter("");
    setShowOnlyMine(false);
    setShowOnlyResponsible(false);
    if (searchParams?.toString()) {
      setIsPendingSearch(true);
      router.push(pathname || "");
    }
  };

  const handleSearchClick = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (dateFilter) params.set("date", dateFilter.toISOString());
    if (requestedAtFilter)
      params.set("requestedAt", requestedAtFilter.toISOString());
    if (statusFilter) params.set("status", statusFilter);
    if (showOnlyMine) params.set("requestedBy", userEmail || "");
    if (showOnlyResponsible) params.set("responsibleEmployee", userEmail || "");
    const newUrl = `${pathname}?${params.toString()}`;
    if (newUrl !== `${pathname}?${searchParams?.toString()}`) {
      setIsPendingSearch(true);
      router.push(newUrl);
    } else {
      setIsPendingSearch(true);
      revalidate();
    }
  };

  const handleShowOnlyMineChange = (checked: boolean) => {
    setShowOnlyMine(checked);
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (checked) {
      params.set("requestedBy", userEmail || "");
    } else {
      params.delete("requestedBy");
    }
    setIsPendingSearch(true);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleShowOnlyResponsibleChange = (checked: boolean) => {
    setShowOnlyResponsible(checked);
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (checked) {
      params.set("responsibleEmployee", userEmail || "");
    } else {
      params.delete("responsibleEmployee");
    }
    setIsPendingSearch(true);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={handleSearchClick} className="flex flex-col gap-4">
          {isLogged && (
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="only-my-requests"
                  checked={showOnlyMine}
                  onCheckedChange={handleShowOnlyMineChange}
                />
                <Label htmlFor="only-my-requests">
                  {dict.tableFiltering.myRequests}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="only-responsible"
                  checked={showOnlyResponsible}
                  onCheckedChange={handleShowOnlyResponsibleChange}
                />
                <Label htmlFor="only-responsible">
                  {dict.tableFiltering.iAmResponsible}
                </Label>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-start gap-2">
            <div className="flex flex-col space-y-1">
              <Label>{dict.tableFiltering.status}</Label>
              <Select onValueChange={setStatusFilter} value={statusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={dict.common.select} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">
                    {dict.tableColumns.statuses.pending}
                  </SelectItem>
                  <SelectItem value="approved">
                    {dict.tableColumns.statuses.approved}
                  </SelectItem>
                  <SelectItem value="canceled">
                    {dict.tableColumns.statuses.canceled}
                  </SelectItem>
                  <SelectItem value="completed">
                    {dict.tableColumns.statuses.completed}
                  </SelectItem>
                  <SelectItem value="accounted">
                    {dict.tableColumns.statuses.accounted}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col space-y-1">
              <Label>{dict.tableFiltering.deadline}</Label>
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
                  />
                )}
              />
            </div>
            <div className="flex flex-col space-y-1">
              <Label>{dict.tableFiltering.dateAdded}</Label>
              <DateTimePicker
                value={requestedAtFilter}
                onChange={setRequestedAtFilter}
                hideTime
                renderTrigger={({ value, setOpen, open }) => (
                  <DateTimeInput
                    value={value}
                    onChange={(x) => !open && setRequestedAtFilter(x)}
                    format="dd/MM/yyyy"
                    disabled={open}
                    onCalendarClick={() => setOpen(!open)}
                  />
                )}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant="secondary"
              className="justify-start"
              disabled={isPendingSearch}
            >
              {isPendingSearch ? (
                <Loader className="animate-spin" />
              ) : (
                <Search />
              )}
              <span>{dict.common.search}</span>
            </Button>

            <Button
              type="button"
              variant="destructive"
              onClick={handleClearFilters}
              title="Clear filters"
              disabled={isPendingSearch}
            >
              <CircleX />
              <span>{dict.common.clear}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
