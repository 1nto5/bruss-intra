'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import { CircleX, Loader, Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { revalidateOvertime as revalidate } from '../actions/utils';
import { Dictionary } from '../lib/dict';
import { OVERTIME_FILTER_STATUSES, STATUS_TO_DICT_KEY } from '../lib/types';

export default function TableFilteringAndOptions({
  fetchTime,
  dict,
}: {
  fetchTime: Date;
  dict: Dictionary;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isPendingSearch, setIsPendingSearch] = useState(false);

  const [monthFilter, setMonthFilter] = useState<string[]>(() => {
    const monthParam = searchParams?.get('month');
    return monthParam ? monthParam.split(',') : [];
  });

  const [yearFilter, setYearFilter] = useState<string[]>(() => {
    const yearParam = searchParams?.get('year');
    return yearParam ? yearParam.split(',') : [];
  });

  const [statusFilter, setStatusFilter] = useState<string[]>(() => {
    const statusParam = searchParams?.get('status');
    return statusParam ? statusParam.split(',') : [];
  });

  const [weekFilter, setWeekFilter] = useState<string[]>(() => {
    const weekParam = searchParams?.get('week');
    return weekParam ? weekParam.split(',') : [];
  });

  const [idFilter, setIdFilter] = useState(() => {
    return searchParams?.get('id') || '';
  });

  // Generate year options
  const yearOptions = (() => {
    const options = [];
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const startYear = 2025;

    for (let year = startYear; year <= currentYear; year++) {
      options.push({
        value: year.toString(),
        label: year.toString(),
      });
    }

    return options.reverse();
  })();

  // Generate month options - use selected years or current year as default
  const monthOptions = (() => {
    const options = [];
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const absoluteStartYear = 2025;

    // Use selected years or default to current year
    const yearsToInclude =
      yearFilter.length > 0
        ? yearFilter.map((y) => parseInt(y)).sort((a, b) => a - b)
        : [currentYear];

    for (const year of yearsToInclude) {
      const monthStart = year === absoluteStartYear ? 5 : 0; // June (month index 5)
      const monthEnd = year === currentYear ? currentMonth : 11;

      for (let month = monthStart; month <= monthEnd; month++) {
        const monthStr = (month + 1).toString().padStart(2, '0');
        const yearStr = year.toString();
        const value = `${yearStr}-${monthStr}`;
        const monthName = dict.months[monthStr as keyof typeof dict.months];
        const displayText = `${monthName} - ${monthStr}.${yearStr}`;

        options.push({
          value,
          label: displayText,
        });
      }
    }

    return options.reverse();
  })();

  // Generate week options for selected year
  const generateWeekOptionsForYear = (year: number) => {
    const options = [];
    const firstDayOfYear = new Date(year, 0, 1);
    const lastDayOfYear = new Date(year, 11, 31);

    const getISOWeek = (date: Date): number => {
      const target = new Date(date.valueOf());
      const dayNumber = (date.getDay() + 6) % 7;
      target.setDate(target.getDate() - dayNumber + 3);
      const firstThursday = target.valueOf();
      target.setMonth(0, 1);
      if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
      }
      return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
    };

    const getFirstDayOfISOWeek = (year: number, week: number): Date => {
      const simple = new Date(year, 0, 1 + (week - 1) * 7);
      const dayOfWeek = simple.getDay();
      const isoWeekStart = simple;
      if (dayOfWeek <= 4) {
        isoWeekStart.setDate(simple.getDate() - simple.getDay() + 1);
      } else {
        isoWeekStart.setDate(simple.getDate() + 8 - simple.getDay());
      }
      return isoWeekStart;
    };

    const firstWeek = getISOWeek(firstDayOfYear);
    const lastWeek = getISOWeek(lastDayOfYear);

    const startWeek = firstWeek === 1 ? 1 : firstWeek;
    const endWeek = lastWeek === 1 ? 52 : lastWeek;

    for (let week = startWeek; week <= endWeek; week++) {
      const monday = getFirstDayOfISOWeek(year, week);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const mondayDay = monday.getDate();
      const sundayDay = sunday.getDate();
      const mondayMonth = monday.getMonth() + 1;
      const sundayMonth = sunday.getMonth() + 1;

      let label;
      if (mondayMonth === sundayMonth) {
        label = `${dict.filters.weekLabel || 'Week'} ${week}: ${mondayDay}-${sundayDay}.${mondayMonth.toString().padStart(2, '0')}`;
      } else {
        label = `${dict.filters.weekLabel || 'Week'} ${week}: ${mondayDay}.${mondayMonth.toString().padStart(2, '0')}-${sundayDay}.${sundayMonth.toString().padStart(2, '0')}`;
      }

      options.push({
        value: `${year}-W${week.toString().padStart(2, '0')}`,
        label,
      });
    }

    return options;
  };

  // Week options - use selected years or current year as default, optionally filtered by month
  const weekOptions = (() => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();

    // Helper to get current ISO week number
    const getCurrentISOWeek = (): number => {
      const target = new Date(currentDate.valueOf());
      const dayNumber = (currentDate.getDay() + 6) % 7;
      target.setDate(target.getDate() - dayNumber + 3);
      const firstThursday = target.valueOf();
      target.setMonth(0, 1);
      if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
      }
      return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
    };

    // Use selected years or default to current year
    const isUsingCurrentYearDefault = yearFilter.length === 0;
    const yearsToInclude = isUsingCurrentYearDefault
      ? [currentYear]
      : yearFilter.map((y) => parseInt(y)).sort((a, b) => a - b);

    // Generate weeks for all selected years
    let allWeeks: { value: string; label: string }[] = [];
    for (const year of yearsToInclude) {
      const yearWeeks = generateWeekOptionsForYear(year);

      // If using current year as default and it's current year, limit to current week
      if (isUsingCurrentYearDefault && year === currentYear) {
        const currentWeek = getCurrentISOWeek();
        allWeeks.push(
          ...yearWeeks.filter((w) => {
            const weekNum = parseInt(w.value.split('-W')[1]);
            return weekNum <= currentWeek;
          }),
        );
      } else {
        allWeeks.push(...yearWeeks);
      }
    }

    // If no month selected, return weeks (already filtered if needed)
    if (monthFilter.length === 0) {
      return allWeeks;
    }

    // Helper to get Monday of ISO week
    const getFirstDayOfISOWeek = (year: number, week: number): Date => {
      const simple = new Date(year, 0, 1 + (week - 1) * 7);
      const dayOfWeek = simple.getDay();
      const isoWeekStart = new Date(simple);
      if (dayOfWeek <= 4) {
        isoWeekStart.setDate(simple.getDate() - simple.getDay() + 1);
      } else {
        isoWeekStart.setDate(simple.getDate() + 8 - simple.getDay());
      }
      return isoWeekStart;
    };

    // If month(s) selected, filter weeks that fall within those months
    const filteredWeeks = allWeeks.filter((weekOption) => {
      const [yearStr, weekPart] = weekOption.value.split('-W');
      const weekYear = parseInt(yearStr);
      const weekNum = parseInt(weekPart);

      const monday = getFirstDayOfISOWeek(weekYear, weekNum);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      // Check if this week overlaps with any selected month
      return monthFilter.some((monthValue) => {
        const [monthYearStr, monthNumStr] = monthValue.split('-');
        const monthYear = parseInt(monthYearStr);
        const monthNum = parseInt(monthNumStr) - 1;

        const monthStart = new Date(monthYear, monthNum, 1);
        const monthEnd = new Date(monthYear, monthNum + 1, 0, 23, 59, 59, 999);

        return (
          (monday >= monthStart && monday <= monthEnd) ||
          (sunday >= monthStart && sunday <= monthEnd) ||
          (monday < monthStart && sunday > monthEnd)
        );
      });
    });

    return filteredWeeks;
  })();

  const handleClearFilters = () => {
    setMonthFilter([]);
    setWeekFilter([]);
    setYearFilter([]);
    setStatusFilter([]);
    setIdFilter('');
    if (searchParams?.toString()) {
      setIsPendingSearch(true);
      router.push(pathname || '');
    }
  };

  const handleYearFilterChange = (values: string[]) => {
    setYearFilter(values);
  };

  const handleWeekFilterChange = (values: string[]) => {
    setWeekFilter(values);
  };

  const handleMonthFilterChange = (values: string[]) => {
    setMonthFilter(values);
  };

  const handleSearchClick = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (weekFilter.length > 0) params.set('week', weekFilter.join(','));
    if (monthFilter.length > 0) params.set('month', monthFilter.join(','));
    if (yearFilter.length > 0) params.set('year', yearFilter.join(','));
    if (statusFilter.length > 0) params.set('status', statusFilter.join(','));
    if (idFilter) params.set('id', idFilter);
    const newUrl = `${pathname}?${params.toString()}`;
    if (newUrl !== `${pathname}?${searchParams?.toString()}`) {
      setIsPendingSearch(true);
      router.push(newUrl);
    } else {
      setIsPendingSearch(true);
      revalidate();
    }
  };

  useEffect(() => {
    setIsPendingSearch(false);
  }, [fetchTime]);

  // Check if any filter is active
  const hasActiveFilters = Boolean(
    weekFilter.length > 0 ||
      monthFilter.length > 0 ||
      yearFilter.length > 0 ||
      statusFilter.length > 0 ||
      idFilter,
  );

  const hasUrlParams = Boolean(searchParams?.toString());

  const hasPendingChanges = (() => {
    const urlMonth = searchParams?.get('month')?.split(',') || [];
    const urlYear = searchParams?.get('year')?.split(',') || [];
    const urlStatus = searchParams?.get('status')?.split(',') || [];
    const urlWeek = searchParams?.get('week')?.split(',') || [];
    const urlId = searchParams?.get('id') || '';

    const arraysEqual = (a: string[], b: string[]) =>
      JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

    return (
      !arraysEqual(monthFilter, urlMonth) ||
      !arraysEqual(yearFilter, urlYear) ||
      !arraysEqual(statusFilter, urlStatus) ||
      !arraysEqual(weekFilter, urlWeek) ||
      idFilter !== urlId
    );
  })();

  const canSearch = hasActiveFilters || hasPendingChanges || hasUrlParams;

  return (
    <Card>
      <CardContent className='p-4'>
        <form onSubmit={handleSearchClick} className='flex flex-col gap-4'>
          {/* Filters row: ID, Status, Year, Month, Week */}
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5'>
            <div className='flex flex-col space-y-1'>
              <Label>{dict.filters.id || 'ID'}</Label>
              <Input
                value={idFilter}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setIdFilter(e.target.value)
                }
                className='w-full'
              />
            </div>
            <div className='flex flex-col space-y-1'>
              <Label>{dict.filters.status}</Label>
              <MultiSelect
                value={statusFilter}
                onValueChange={setStatusFilter}
                placeholder={dict.filters.select}
                searchPlaceholder={dict.filters.searchPlaceholder}
                emptyText={dict.filters.notFound}
                clearLabel={dict.filters.clearFilter}
                selectedLabel={dict.filters.selected}
                className='w-full'
                options={OVERTIME_FILTER_STATUSES.map((status) => ({
                  value: status,
                  label: dict.status[STATUS_TO_DICT_KEY[status]],
                }))}
              />
            </div>
            <div className='flex flex-col space-y-1'>
              <Label>{dict.filters.year}</Label>
              <MultiSelect
                value={yearFilter}
                onValueChange={handleYearFilterChange}
                placeholder={dict.filters.select}
                searchPlaceholder={dict.filters.searchPlaceholder}
                emptyText={dict.filters.notFound}
                clearLabel={dict.filters.clearFilter}
                selectedLabel={dict.filters.selected}
                className='w-full'
                options={yearOptions}
              />
            </div>
            <div className='flex flex-col space-y-1'>
              <Label>{dict.filters.month}</Label>
              <MultiSelect
                value={monthFilter}
                onValueChange={handleMonthFilterChange}
                placeholder={dict.filters.select}
                searchPlaceholder={dict.filters.searchPlaceholder}
                emptyText={dict.filters.notFound}
                clearLabel={dict.filters.clearFilter}
                selectedLabel={dict.filters.selected}
                className='w-full'
                options={monthOptions}
              />
            </div>
            <div className='flex flex-col space-y-1'>
              <Label>{dict.filters.week}</Label>
              <MultiSelect
                value={weekFilter}
                onValueChange={handleWeekFilterChange}
                placeholder={dict.filters.select}
                searchPlaceholder={dict.filters.searchPlaceholder}
                emptyText={dict.filters.notFound}
                clearLabel={dict.filters.clearFilter}
                selectedLabel={dict.filters.selected}
                className='w-full'
                options={weekOptions}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className='flex flex-col gap-2 sm:flex-row sm:justify-between'>
            <Button
              type='button'
              variant='destructive'
              onClick={handleClearFilters}
              title={dict.filters.clear}
              disabled={isPendingSearch || !canSearch}
              className='order-2 w-full sm:order-1 sm:w-auto'
            >
              <CircleX /> <span>{dict.filters.clear}</span>
            </Button>

            <Button
              type='submit'
              variant='secondary'
              disabled={isPendingSearch || !canSearch}
              className='order-1 w-full sm:order-2 sm:w-auto'
            >
              {isPendingSearch ? (
                <Loader className='animate-spin' />
              ) : (
                <Search />
              )}
              <span>{dict.filters.search}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
