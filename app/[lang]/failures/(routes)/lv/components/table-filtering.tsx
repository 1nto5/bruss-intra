"use client";

import { Button } from "@/components/ui/button";
import { ClearableCombobox } from "@/components/clearable-combobox";
import { FreeTextCombobox } from "@/components/free-text-combobox";
import { Card, CardContent } from "@/components/ui/card";
import { DateTimeInput } from "@/components/ui/datetime-input";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { FilterField } from "@/components/ui/filter-field";
import { FilterGrid } from "@/components/ui/filter-grid";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CircleX, Loader, Search, Sheet } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { revalidateFailures as revalidate } from "../actions/utils";
import { FailureOptionType } from "../lib/types";
import type { Dictionary } from "../../../lib/dict";
import { EmployeeType } from "@/lib/types/employee-types";

export default function TableFiltering({
  fetchTime,
  failuresOptions,
  employees,
  dict,
}: {
  fetchTime: Date;
  failuresOptions: FailureOptionType[];
  employees: EmployeeType[];
  dict: Dictionary;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isPendingSearch, setIsPendingSearch] = useState(false);

  useEffect(() => {
    setIsPendingSearch(false);
  }, [fetchTime]);

  const [fromFilter, setFromFilter] = useState(() => {
    const fromParam = searchParams?.get("from");
    return fromParam ? new Date(fromParam) : undefined;
  });
  const [toFilter, setToFilter] = useState(() => {
    const toParam = searchParams?.get("to");
    return toParam ? new Date(toParam) : undefined;
  });
  const [lineFilter, setLineFilter] = useState(searchParams?.get("line") || "");
  const [stationFilter, setStationFilter] = useState(
    searchParams?.get("station") || "",
  );
  const [failureFilter, setFailureFilter] = useState(
    searchParams?.get("failure") || "",
  );
  const [supervisorFilter, setSupervisorFilter] = useState(
    searchParams?.get("supervisor") || "",
  );
  const [responsibleFilter, setResponsibleFilter] = useState(
    searchParams?.get("responsible") || "",
  );

  const hasActiveFilters =
    fromFilter ||
    toFilter ||
    lineFilter ||
    stationFilter ||
    failureFilter ||
    supervisorFilter ||
    responsibleFilter;

  const hasUrlParams = Boolean(searchParams?.toString());

  const hasPendingChanges = (() => {
    const urlFrom = searchParams?.get("from") || "";
    const urlTo = searchParams?.get("to") || "";
    const urlLine = searchParams?.get("line") || "";
    const urlStation = searchParams?.get("station") || "";
    const urlFailure = searchParams?.get("failure") || "";
    const urlSupervisor = searchParams?.get("supervisor") || "";
    const urlResponsible = searchParams?.get("responsible") || "";

    return (
      (fromFilter?.toISOString() || "") !== urlFrom ||
      (toFilter?.toISOString() || "") !== urlTo ||
      lineFilter !== urlLine ||
      stationFilter !== urlStation ||
      failureFilter !== urlFailure ||
      supervisorFilter !== urlSupervisor ||
      responsibleFilter !== urlResponsible
    );
  })();

  const canSearch = hasActiveFilters || hasPendingChanges || hasUrlParams;

  const sortedEmployees = [...employees].sort((a, b) =>
    a.lastName !== b.lastName
      ? a.lastName.localeCompare(b.lastName)
      : a.firstName.localeCompare(b.firstName),
  );

  const handleClearFilters = useCallback(() => {
    setFromFilter(undefined);
    setToFilter(undefined);
    setLineFilter("");
    setStationFilter("");
    setFailureFilter("");
    setSupervisorFilter("");
    setResponsibleFilter("");
    if (searchParams?.toString()) {
      setIsPendingSearch(true);
      router.push(pathname || "");
    }
  }, [searchParams, pathname, router]);

  const handleSearchClick = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const params = new URLSearchParams();
      if (fromFilter) params.set("from", fromFilter.toISOString());
      if (toFilter) params.set("to", toFilter.toISOString());
      if (lineFilter) params.set("line", lineFilter);
      if (stationFilter) params.set("station", stationFilter);
      if (failureFilter) params.set("failure", failureFilter);
      if (supervisorFilter) params.set("supervisor", supervisorFilter);
      if (responsibleFilter) params.set("responsible", responsibleFilter);
      const newUrl = `${pathname}?${params.toString()}`;
      if (newUrl !== `${pathname}?${searchParams?.toString()}`) {
        setIsPendingSearch(true);
        router.push(newUrl);
      } else {
        setIsPendingSearch(true);
        revalidate();
      }
    },
    [
      fromFilter,
      toFilter,
      lineFilter,
      stationFilter,
      failureFilter,
      supervisorFilter,
      responsibleFilter,
      pathname,
      searchParams,
      router,
    ],
  );

  const stationsOptions = failuresOptions
    .filter((option) => option.line === lineFilter)
    .map((option) => option.station);

  const filteredFailures =
    failuresOptions.find((option) => option.station === stationFilter)
      ?.options || [];

  return (
    <Card className="mt-4">
      <CardContent className="p-4">
        <form onSubmit={handleSearchClick} className="flex flex-col gap-4">
          <FilterGrid cols={4}>
            <FilterField label={dict.filters.from}>
              <DateTimePicker
                value={fromFilter}
                onChange={setFromFilter}
                max={toFilter || new Date()}
                renderTrigger={({ value, setOpen, open }) => (
                  <DateTimeInput
                    value={value}
                    onChange={(x) => !open && setFromFilter(x)}
                    format="dd/MM/yyyy HH:mm"
                    disabled={open}
                    onCalendarClick={() => setOpen(!open)}
                    className="w-full"
                  />
                )}
              />
            </FilterField>
            <FilterField label={dict.filters.to}>
              <DateTimePicker
                value={toFilter}
                onChange={setToFilter}
                max={new Date()}
                min={fromFilter}
                renderTrigger={({ value, setOpen, open }) => (
                  <DateTimeInput
                    value={value}
                    onChange={(x) => !open && setToFilter(x)}
                    format="dd/MM/yyyy HH:mm"
                    disabled={open}
                    onCalendarClick={() => setOpen(!open)}
                    className="w-full"
                  />
                )}
              />
            </FilterField>
            <FilterField label={dict.filters.supervisor}>
              <ClearableCombobox
                value={supervisorFilter}
                onValueChange={setSupervisorFilter}
                options={sortedEmployees.map((e) => ({
                  value: `${e.firstName} ${e.lastName}`,
                  label: `${e.firstName} ${e.lastName}`,
                }))}
                className="w-full"
              />
            </FilterField>

            <FilterField label={dict.filters.responsible}>
              <FreeTextCombobox
                value={responsibleFilter}
                onValueChange={setResponsibleFilter}
                options={sortedEmployees.map(
                  (e) => `${e.firstName} ${e.lastName}`,
                )}
                className="w-full"
              />
            </FilterField>
          </FilterGrid>
          <FilterGrid cols={4}>
            <FilterField label={dict.filters.line}>
              <RadioGroup
                value={lineFilter}
                onValueChange={setLineFilter}
                className="flex flex-row gap-4 h-9 items-center"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="lv1" id="filter-lv1" />
                  <Label htmlFor="filter-lv1">LV1</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="lv2" id="filter-lv2" />
                  <Label htmlFor="filter-lv2">LV2</Label>
                </div>
              </RadioGroup>
            </FilterField>
            {lineFilter && (
              <FilterField label={dict.filters.station}>
                <ClearableCombobox
                  value={stationFilter}
                  onValueChange={setStationFilter}
                  options={stationsOptions.map((s) => ({
                    value: s,
                    label: s,
                  }))}
                  className="w-full"
                />
              </FilterField>
            )}
            {stationFilter && (
              <FilterField label={dict.filters.failure}>
                <ClearableCombobox
                  value={failureFilter}
                  onValueChange={setFailureFilter}
                  options={filteredFailures.map((f) => ({
                    value: f,
                    label: f,
                  }))}
                  className="w-full"
                />
              </FilterField>
            )}
          </FilterGrid>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={handleClearFilters}
              title="Clear filters"
              disabled={isPendingSearch || !canSearch}
              className="order-2 w-full sm:order-1 sm:w-auto"
            >
              <CircleX /> <span>{dict.filters.clear}</span>
            </Button>

            <div className="order-1 flex flex-col gap-2 sm:order-2 sm:flex-row">
              <Link
                href={`/api/failures/lv/excel?${new URLSearchParams(
                  Object.entries({
                    line: lineFilter,
                    station: stationFilter,
                    failure: failureFilter,
                    supervisor: supervisorFilter,
                    responsible: responsibleFilter,
                    from: fromFilter?.toISOString(),
                    to: toFilter?.toISOString(),
                  }).filter((entry): entry is [string, string] => !!entry[1]),
                ).toString()}`}
              >
                <Button type="button" className="w-full sm:w-auto">
                  <Sheet /> <span>{dict.filters.exportToExcel}</span>
                </Button>
              </Link>

              <Button
                type="submit"
                variant="secondary"
                disabled={isPendingSearch || !canSearch}
                className="w-full sm:w-auto"
              >
                {isPendingSearch ? (
                  <Loader className="animate-spin" />
                ) : (
                  <Search />
                )}
                <span>{dict.filters.search}</span>
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
