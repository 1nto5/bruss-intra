"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

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

  const defaultYear = new Date().getFullYear();
  const defaultMonth = new Date().getMonth() + 1;

  const [yearFilter, setYearFilter] = useState<number>(() => {
    const yearParam = searchParams?.get("year");
    return yearParam ? parseInt(yearParam, 10) : defaultYear;
  });

  const [monthFilter, setMonthFilter] = useState<number>(() => {
    const monthParam = searchParams?.get("month");
    return monthParam ? parseInt(monthParam, 10) : defaultMonth;
  });

  // Generate years for dropdown (current year and 1 year back)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 2 }, (_, i) => currentYear - i);

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const handleSearchClick = (e: React.FormEvent) => {
    e.preventDefault();

    const params = new URLSearchParams();
    params.set("year", yearFilter.toString());
    params.set("month", monthFilter.toString());

    const newUrl = `${pathname}?${params.toString()}`;
    if (newUrl !== `${pathname}?${searchParams?.toString()}`) {
      setIsPendingSearch(true);
      router.push(newUrl);
    }
  };

  // Check if current filters differ from URL params
  const currentYearParam = searchParams?.get("year");
  const currentMonthParam = searchParams?.get("month");
  const hasFilterChanges =
    yearFilter.toString() !== (currentYearParam || defaultYear.toString()) ||
    monthFilter.toString() !== (currentMonthParam || defaultMonth.toString());

  return (
    <form onSubmit={handleSearchClick} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Select
          value={monthFilter.toString()}
          onValueChange={(value) => setMonthFilter(parseInt(value, 10))}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {months.map((month) => (
              <SelectItem key={month.value} value={month.value.toString()}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={yearFilter.toString()}
          onValueChange={(value) => setYearFilter(parseInt(value, 10))}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="submit"
          variant="secondary"
          className="justify-start"
          disabled={isPendingSearch || !hasFilterChanges}
        >
          {isPendingSearch ? (
            <>
              <Loader className="animate-spin" />
              <span>Searching...</span>
            </>
          ) : (
            <>
              <Search />
              <span>Search</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
