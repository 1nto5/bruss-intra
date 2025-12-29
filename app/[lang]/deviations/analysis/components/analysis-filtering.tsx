'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DateTimeInput } from '@/components/ui/datetime-input';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CircleX, Loader, Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface AnalysisFilteringProps {
  dict: any;
}

export default function AnalysisFiltering({ dict }: AnalysisFilteringProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentMode = searchParams?.get('mode') || 'month';

  const [mode, setMode] = useState(currentMode);
  const [isPendingSearch, setIsPendingSearch] = useState(false);

  useEffect(() => {
    setIsPendingSearch(false);
  }, [searchParams]);

  // Week mode
  const [weekYear, setWeekYear] = useState(() => {
    return parseInt(
      searchParams?.get('year') || new Date().getFullYear().toString(),
    );
  });
  const [weekNumber, setWeekNumber] = useState(() => {
    return parseInt(searchParams?.get('week') || '1');
  });

  // Month mode
  const [monthYear, setMonthYear] = useState(() => {
    return parseInt(
      searchParams?.get('year') || new Date().getFullYear().toString(),
    );
  });
  const [monthNumber, setMonthNumber] = useState(() => {
    return parseInt(
      searchParams?.get('month') || (new Date().getMonth() + 1).toString(),
    );
  });

  // Quarter mode
  const [quarterYear, setQuarterYear] = useState(() => {
    return parseInt(
      searchParams?.get('year') || new Date().getFullYear().toString(),
    );
  });
  const [quarterNumber, setQuarterNumber] = useState(() => {
    return parseInt(
      searchParams?.get('quarter') ||
        (Math.floor(new Date().getMonth() / 3) + 1).toString(),
    );
  });

  // Year mode
  const [yearValue, setYearValue] = useState(() => {
    return parseInt(
      searchParams?.get('year') || new Date().getFullYear().toString(),
    );
  });

  // Range mode
  const [fromDate, setFromDate] = useState<Date>(() => {
    const fromParam = searchParams?.get('from');
    if (fromParam) return new Date(fromParam);
    const defaultFrom = new Date();
    defaultFrom.setDate(defaultFrom.getDate() - 30);
    return defaultFrom;
  });

  const [toDate, setToDate] = useState<Date>(() => {
    const toParam = searchParams?.get('to');
    return toParam ? new Date(toParam) : new Date();
  });

  const handleClearFilters = () => {
    setMode('month');
    const defaultFrom = new Date();
    defaultFrom.setDate(defaultFrom.getDate() - 30);
    setFromDate(defaultFrom);
    setToDate(new Date());
    setWeekYear(new Date().getFullYear());
    setWeekNumber(1);
    setMonthYear(new Date().getFullYear());
    setMonthNumber(new Date().getMonth() + 1);
    setQuarterYear(new Date().getFullYear());
    setQuarterNumber(Math.floor(new Date().getMonth() / 3) + 1);
    setYearValue(new Date().getFullYear());

    if (searchParams?.toString()) {
      setIsPendingSearch(true);
      router.push(pathname || '');
    }
  };

  const handleSearchClick = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPendingSearch(true);
    const params = new URLSearchParams();
    params.set('mode', mode);

    switch (mode) {
      case 'week':
        params.set('year', weekYear.toString());
        params.set('week', weekNumber.toString());
        break;
      case 'month':
        params.set('year', monthYear.toString());
        params.set('month', monthNumber.toString());
        break;
      case 'quarter':
        params.set('year', quarterYear.toString());
        params.set('quarter', quarterNumber.toString());
        break;
      case 'year':
        params.set('year', yearValue.toString());
        break;
      case 'range':
        params.set('from', fromDate.toISOString().split('T')[0]);
        params.set('to', toDate.toISOString().split('T')[0]);
        break;
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const weeks = Array.from({ length: 53 }, (_, i) => i + 1);

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const quarters = [
    { value: 1, label: 'Q1 (Jan-Mar)' },
    { value: 2, label: 'Q2 (Apr-Jun)' },
    { value: 3, label: 'Q3 (Jul-Sep)' },
    { value: 4, label: 'Q4 (Oct-Dec)' },
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={handleSearchClick} className="flex flex-col gap-4">
          <div>
            <Tabs value={mode} onValueChange={setMode}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="week">
                  {dict.analysis.filters.week}
                </TabsTrigger>
                <TabsTrigger value="month">
                  {dict.analysis.filters.month}
                </TabsTrigger>
                <TabsTrigger value="quarter">
                  {dict.analysis.filters.quarter}
                </TabsTrigger>
                <TabsTrigger value="year">
                  {dict.analysis.filters.year}
                </TabsTrigger>
                <TabsTrigger value="range">
                  {dict.analysis.filters.range}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Week Mode */}
          {mode === 'week' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col space-y-1">
                <Label>{dict.analysis.filters.selectYear}</Label>
                <Select
                  value={weekYear.toString()}
                  onValueChange={(v) => setWeekYear(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col space-y-1">
                <Label>{dict.analysis.filters.selectWeek}</Label>
                <Select
                  value={weekNumber.toString()}
                  onValueChange={(v) => setWeekNumber(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {weeks.map((week) => (
                      <SelectItem key={week} value={week.toString()}>
                        {dict.analysis.filters.week} {week}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Month Mode */}
          {mode === 'month' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col space-y-1">
                <Label>{dict.analysis.filters.selectYear}</Label>
                <Select
                  value={monthYear.toString()}
                  onValueChange={(v) => setMonthYear(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col space-y-1">
                <Label>{dict.analysis.filters.selectMonth}</Label>
                <Select
                  value={monthNumber.toString()}
                  onValueChange={(v) => setMonthNumber(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month, idx) => (
                      <SelectItem key={idx + 1} value={(idx + 1).toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Quarter Mode */}
          {mode === 'quarter' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col space-y-1">
                <Label>{dict.analysis.filters.selectYear}</Label>
                <Select
                  value={quarterYear.toString()}
                  onValueChange={(v) => setQuarterYear(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col space-y-1">
                <Label>{dict.analysis.filters.selectQuarter}</Label>
                <Select
                  value={quarterNumber.toString()}
                  onValueChange={(v) => setQuarterNumber(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {quarters.map((q) => (
                      <SelectItem key={q.value} value={q.value.toString()}>
                        {q.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Year Mode */}
          {mode === 'year' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col space-y-1">
                <Label>{dict.analysis.filters.selectYear}</Label>
                <Select
                  value={yearValue.toString()}
                  onValueChange={(v) => setYearValue(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Range Mode */}
          {mode === 'range' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col space-y-1">
                <Label>{dict.analysis.filters.from}</Label>
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
                <Label>{dict.analysis.filters.to}</Label>
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
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2 sm:grid sm:grid-cols-3 sm:gap-4">
            <Button
              type="button"
              variant="destructive"
              onClick={handleClearFilters}
              title={dict.analysis.filters.clear}
              disabled={isPendingSearch}
              className="order-2 w-full sm:order-1"
            >
              <CircleX />
              <span>{dict.analysis.filters.clear}</span>
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
              <span>{dict.analysis.filters.search}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
