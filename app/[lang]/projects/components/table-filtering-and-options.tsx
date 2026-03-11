"use client";

import { Button } from "@/components/ui/button";
import { DateTimeInput } from "@/components/ui/datetime-input";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import {
  CalendarClock,
  CircleX,
  Loader,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { revalidateProjects as revalidate } from "../actions";
import LocalizedLink from "@/components/localized-link";

export default function TableFilteringAndOptions({
  fetchTime,
}: {
  fetchTime: Date;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isPendingSearch, setIsPendingSearch] = useState(false);

  useEffect(() => {
    setIsPendingSearch(false);
  }, [fetchTime]);

  const [dateFilter, setDateFilter] = useState(() => {
    const dateParam = searchParams?.get("date");
    return dateParam ? new Date(dateParam) : undefined;
  });

  const handleClearFilters = () => {
    setDateFilter(undefined);
    if (searchParams?.toString()) {
      setIsPendingSearch(true);
      router.push(pathname || "");
    }
  };

  const handleSearchClick = (e: React.FormEvent) => {
    e.preventDefault();

    const params = new URLSearchParams();
    if (dateFilter) params.set("date", dateFilter.toISOString());
    const newUrl = `${pathname}?${params.toString()}`;
    if (newUrl !== `${pathname}?${searchParams?.toString()}`) {
      setIsPendingSearch(true);
      router.push(newUrl);
    } else {
      setIsPendingSearch(true);
      revalidate();
    }
  };

  return (
    <form onSubmit={handleSearchClick} className="flex flex-col gap-2">
      <div className="flex items-center space-x-2">
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

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          variant="secondary"
          className="justify-start"
          disabled={isPendingSearch}
        >
          {isPendingSearch ? (
            <>
              <Loader className={"animate-spin"} />{" "}
              <span>{dateFilter ? "Search" : "Refresh"}</span>
            </>
          ) : (
            <>
              {dateFilter ? <Search /> : <RefreshCw />}{" "}
              <span>{dateFilter ? "Search" : "Refresh"}</span>
            </>
          )}
        </Button>

        {dateFilter && (
          <Button
            variant="destructive"
            onClick={handleClearFilters}
            title="Clear filters"
          >
            <CircleX /> <span>Clear</span>
          </Button>
        )}
        <LocalizedLink href="/projects/new-entry">
          <Button variant={"outline"}>
            <Plus /> <span>Add New Entry</span>
          </Button>
        </LocalizedLink>
        <LocalizedLink href="/projects/summary">
          <Button variant={"outline"}>
            <CalendarClock /> <span>Summary</span>
          </Button>
        </LocalizedLink>
      </div>
    </form>
  );
}
