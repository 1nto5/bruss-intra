"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DateTimeInput } from "@/components/ui/datetime-input";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Label } from "@/components/ui/label";
import { ClearableCombobox } from "@/components/clearable-combobox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CircleX, Loader, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Dictionary } from "../lib/dict";
import { MultiSelect } from "@/components/ui/multi-select";

interface OeeFilteringAndOptionsProps {
  dict: Dictionary;
  ovens?: string[]; // Optional: list of available ovens
}

export default function OeeFilteringAndOptions({
  dict,
  ovens,
}: OeeFilteringAndOptionsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get current mode from URL or default to 'range'
  const currentMode = searchParams?.get("mode") || "range";

  // State for each mode
  const [mode, setMode] = useState(currentMode);
  const [isPendingSearch, setIsPendingSearch] = useState(false);

  // Reset pending state when search params change (navigation complete)
  useEffect(() => {
    setIsPendingSearch(false);
  }, [searchParams]);

  // Day mode
  const [dayDate, setDayDate] = useState<Date>(() => {
    const dateParam = searchParams?.get("date");
    return dateParam ? new Date(dateParam) : new Date();
  });

  // Week mode
  const [weekYear, setWeekYear] = useState(() => {
    return parseInt(
      searchParams?.get("year") || new Date().getFullYear().toString(),
    );
  });
  const [weekNumber, setWeekNumber] = useState(() => {
    return parseInt(searchParams?.get("week") || "1");
  });

  // Month mode
  const [monthYear, setMonthYear] = useState(() => {
    return parseInt(
      searchParams?.get("year") || new Date().getFullYear().toString(),
    );
  });
  const [monthNumber, setMonthNumber] = useState(() => {
    return parseInt(
      searchParams?.get("month") || (new Date().getMonth() + 1).toString(),
    );
  });

  // Range mode
  const [fromDate, setFromDate] = useState<Date>(() => {
    const fromParam = searchParams?.get("from");
    if (fromParam) return new Date(fromParam);
    const defaultFrom = new Date();
    defaultFrom.setDate(defaultFrom.getDate() - 30);
    return defaultFrom;
  });

  const [toDate, setToDate] = useState<Date>(() => {
    const toParam = searchParams?.get("to");
    return toParam ? new Date(toParam) : new Date();
  });

  // Oven filter state (only if ovens prop is provided)
  const [selectedOvens, setSelectedOvens] = useState<string[]>(() => {
    if (!ovens) return [];
    const param = searchParams?.get("oven");
    return param ? param.split(",").filter((o) => o.length > 0) : [];
  });

  const handleClearFilters = () => {
    setMode("range");
    const defaultFrom = new Date();
    defaultFrom.setDate(defaultFrom.getDate() - 30);
    setFromDate(defaultFrom);
    setToDate(new Date());
    setDayDate(new Date());
    setWeekYear(new Date().getFullYear());
    setWeekNumber(1);
    setMonthYear(new Date().getFullYear());
    setMonthNumber(new Date().getMonth() + 1);
    setSelectedOvens([]);

    if (searchParams?.toString()) {
      setIsPendingSearch(true);
      router.push(pathname || "");
    }
  };

  const handleSearchClick = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPendingSearch(true);
    const params = new URLSearchParams();
    params.set("mode", mode);

    switch (mode) {
      case "day":
        if (dayDate) {
          params.set("date", dayDate.toISOString().split("T")[0]);
        }
        break;
      case "week":
        params.set("year", weekYear.toString());
        params.set("week", weekNumber.toString());
        break;
      case "month":
        params.set("year", monthYear.toString());
        params.set("month", monthNumber.toString());
        break;
      case "range":
        params.set("from", fromDate.toISOString().split("T")[0]);
        params.set("to", toDate.toISOString().split("T")[0]);
        break;
    }

    // Add oven parameter if ovens are selected
    if (selectedOvens.length > 0) {
      params.set("oven", selectedOvens.join(","));
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  // Generate year options (current year ± 2 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // Generate week options (1-53)
  const weeks = Array.from({ length: 53 }, (_, i) => i + 1);

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={handleSearchClick} className="flex flex-col gap-4">
          {/* Mode Selector */}
          <div>
            <Tabs value={mode} onValueChange={setMode}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="range">
                  {dict.timeFilters.range}
                </TabsTrigger>
                <TabsTrigger value="day">{dict.timeFilters.day}</TabsTrigger>
                <TabsTrigger value="week">{dict.timeFilters.week}</TabsTrigger>
                <TabsTrigger value="month">
                  {dict.timeFilters.month}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Day Mode */}
          {mode === "day" && (
            <div
              className={`grid grid-cols-1 gap-4 ${ovens && ovens.length > 0 ? "sm:grid-cols-2" : ""}`}
            >
              <div className="flex flex-col space-y-1">
                <Label>{dict.timeFilters.selectDate}</Label>
                <DateTimePicker
                  value={dayDate}
                  onChange={(date) => setDayDate(date || new Date())}
                  max={new Date()}
                  hideTime={true}
                  renderTrigger={({ value, setOpen, open }) => (
                    <DateTimeInput
                      value={value}
                      onChange={(x) => !open && setDayDate(x || new Date())}
                      format="dd/MM/yyyy"
                      disabled={open}
                      onCalendarClick={() => setOpen(!open)}
                      className="w-full"
                    />
                  )}
                />
              </div>
              {/* Oven Filter for day mode */}
              {ovens && ovens.length > 0 && (
                <div className="flex flex-col space-y-1">
                  <Label>{dict.processFilters?.oven || "Ovens"}</Label>
                  <MultiSelect
                    options={ovens.map((oven) => ({
                      value: oven,
                      label: oven.toUpperCase(),
                    }))}
                    value={selectedOvens}
                    onValueChange={setSelectedOvens}
                  />
                </div>
              )}
            </div>
          )}

          {/* Week Mode */}
          {mode === "week" && (
            <div
              className={`grid grid-cols-1 gap-4 ${ovens && ovens.length > 0 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
            >
              <div className="flex flex-col space-y-1">
                <Label>{dict.timeFilters.year}</Label>
                <ClearableCombobox
                  value={weekYear.toString()}
                  onValueChange={(v) =>
                    setWeekYear(v ? parseInt(v) : currentYear)
                  }
                  options={years.map((y) => ({
                    value: y.toString(),
                    label: y.toString(),
                  }))}
                />
              </div>
              <div className="flex flex-col space-y-1">
                <Label>{dict.timeFilters.weekLabel}</Label>
                <ClearableCombobox
                  value={weekNumber.toString()}
                  onValueChange={(v) => setWeekNumber(v ? parseInt(v) : 1)}
                  options={weeks.map((w) => ({
                    value: w.toString(),
                    label: `${dict.timeFilters.weekLabel} ${w}`,
                  }))}
                />
              </div>
              {/* Oven Filter for week mode */}
              {ovens && ovens.length > 0 && (
                <div className="flex flex-col space-y-1">
                  <Label>{dict.processFilters?.oven || "Ovens"}</Label>
                  <MultiSelect
                    options={ovens.map((oven) => ({
                      value: oven,
                      label: oven.toUpperCase(),
                    }))}
                    value={selectedOvens}
                    onValueChange={setSelectedOvens}
                  />
                </div>
              )}
            </div>
          )}

          {/* Month Mode */}
          {mode === "month" && (
            <div
              className={`grid grid-cols-1 gap-4 ${ovens && ovens.length > 0 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
            >
              <div className="flex flex-col space-y-1">
                <Label>{dict.timeFilters.year}</Label>
                <ClearableCombobox
                  value={monthYear.toString()}
                  onValueChange={(v) =>
                    setMonthYear(v ? parseInt(v) : currentYear)
                  }
                  options={years.map((y) => ({
                    value: y.toString(),
                    label: y.toString(),
                  }))}
                />
              </div>
              <div className="flex flex-col space-y-1">
                <Label>{dict.timeFilters.month}</Label>
                <ClearableCombobox
                  value={monthNumber.toString()}
                  onValueChange={(v) =>
                    setMonthNumber(
                      v ? parseInt(v) : new Date().getMonth() + 1,
                    )
                  }
                  options={dict.timeFilters.months.map((month, idx) => ({
                    value: (idx + 1).toString(),
                    label: month,
                  }))}
                />
              </div>
              {/* Oven Filter for month mode */}
              {ovens && ovens.length > 0 && (
                <div className="flex flex-col space-y-1">
                  <Label>{dict.processFilters?.oven || "Ovens"}</Label>
                  <MultiSelect
                    options={ovens.map((oven) => ({
                      value: oven,
                      label: oven.toUpperCase(),
                    }))}
                    value={selectedOvens}
                    onValueChange={setSelectedOvens}
                  />
                </div>
              )}
            </div>
          )}

          {/* Range Mode */}
          {mode === "range" && (
            <div
              className={`grid grid-cols-1 gap-4 ${ovens && ovens.length > 0 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
            >
              <div className="flex flex-col space-y-1">
                <Label>{dict.timeFilters.from}</Label>
                <DateTimePicker
                  value={fromDate}
                  onChange={(date) => setFromDate(date || new Date())}
                  max={toDate}
                  hideTime={true}
                  renderTrigger={({ value, setOpen, open }) => (
                    <DateTimeInput
                      value={value}
                      onChange={(x) => !open && setFromDate(x || new Date())}
                      format="dd/MM/yyyy"
                      disabled={open}
                      onCalendarClick={() => setOpen(!open)}
                      className="w-full"
                    />
                  )}
                />
              </div>
              <div className="flex flex-col space-y-1">
                <Label>{dict.timeFilters.to}</Label>
                <DateTimePicker
                  value={toDate}
                  onChange={(date) => setToDate(date || new Date())}
                  max={new Date()}
                  min={fromDate}
                  hideTime={true}
                  renderTrigger={({ value, setOpen, open }) => (
                    <DateTimeInput
                      value={value}
                      onChange={(x) => !open && setToDate(x || new Date())}
                      format="dd/MM/yyyy"
                      disabled={open}
                      onCalendarClick={() => setOpen(!open)}
                      className="w-full"
                    />
                  )}
                />
              </div>
              {/* Oven Filter (optional, integrated in range mode) */}
              {ovens && ovens.length > 0 && (
                <div className="flex flex-col space-y-1">
                  <Label>{dict.processFilters?.oven || "Ovens"}</Label>
                  <MultiSelect
                    options={ovens.map((oven) => ({
                      value: oven,
                      label: oven.toUpperCase(),
                    }))}
                    value={selectedOvens}
                    onValueChange={setSelectedOvens}
                  />
                </div>
              )}
            </div>
          )}

          {/* Action buttons - Clear and Search */}
          <div className="flex flex-col gap-2 sm:grid sm:grid-cols-3 sm:gap-4">
            <Button
              type="button"
              variant="destructive"
              onClick={handleClearFilters}
              title={dict.timeFilters.clear}
              disabled={isPendingSearch}
              className="order-2 w-full sm:order-1"
            >
              <CircleX />
              <span>{dict.timeFilters.clear}</span>
            </Button>

            <Button
              type="submit"
              variant="secondary"
              disabled={isPendingSearch}
              className="order-1 w-full sm:order-2 sm:col-span-2"
            >
              {isPendingSearch ? (
                <Loader className="animate-spin" />
              ) : (
                <Search />
              )}
              <span>{dict.timeFilters.search}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
