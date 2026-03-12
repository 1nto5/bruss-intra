"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { FilterField } from "@/components/ui/filter-field";
import { FilterGrid } from "@/components/ui/filter-grid";
import { FilterActions } from "@/components/ui/filter-actions";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { DateTimeInput } from "@/components/ui/datetime-input";
import {
  formatDateTimeYmdHm,
  parseDateTimeString,
} from "../../../lib/time-utils";
import type { Dictionary } from "../../../lib/dict";

interface HistoryFiltersProps {
  dict: Dictionary;
  q: string;
  from: string;
  to: string;
}

export default function HistoryFilters({
  dict,
  q,
  from,
  to,
}: HistoryFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(q);
  const [dateFrom, setDateFrom] = useState(from);
  const [dateTo, setDateTo] = useState(to);

  const dateFromObj = parseDateTimeString(dateFrom);
  const dateToObj = parseDateTimeString(dateTo);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClear = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    router.push(pathname);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FilterGrid cols={3}>
            <FilterField label={dict.history.search}>
              <Input
                placeholder={dict.history.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </FilterField>
            <FilterField label={dict.history.from}>
              <DateTimePicker
                value={dateFromObj}
                onChange={(d) => setDateFrom(d ? formatDateTimeYmdHm(d) : "")}
                timePicker={{
                  hour: true,
                  minute: true,
                  second: false,
                }}
                clearable
                renderTrigger={({ value, setOpen, open }) => (
                  <DateTimeInput
                    value={value}
                    onChange={(d) =>
                      setDateFrom(d ? formatDateTimeYmdHm(d) : "")
                    }
                    format="dd/MM/yyyy HH:mm"
                    onCalendarClick={() => setOpen(!open)}
                  />
                )}
              />
            </FilterField>
            <FilterField label={dict.history.to}>
              <DateTimePicker
                value={dateToObj}
                onChange={(d) => setDateTo(d ? formatDateTimeYmdHm(d) : "")}
                timePicker={{
                  hour: true,
                  minute: true,
                  second: false,
                }}
                clearable
                renderTrigger={({ value, setOpen, open }) => (
                  <DateTimeInput
                    value={value}
                    onChange={(d) => setDateTo(d ? formatDateTimeYmdHm(d) : "")}
                    format="dd/MM/yyyy HH:mm"
                    onCalendarClick={() => setOpen(!open)}
                  />
                )}
              />
            </FilterField>
          </FilterGrid>
          <FilterActions
            onClear={handleClear}
            clearLabel={dict.history.clear}
            searchLabel={dict.history.searchButton}
          />
        </form>
      </CardContent>
    </Card>
  );
}
