'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import { CircleX, Loader, Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Dictionary } from '../lib/dict';
import { OVERTIME_FILTER_STATUSES } from '../lib/types';

const STATUS_DICT_KEYS: Record<
  (typeof OVERTIME_FILTER_STATUSES)[number],
  keyof Dictionary['status']
> = {
  pending: 'pending',
  'pending-plant-manager': 'pendingPlantManager',
  approved: 'approved',
  rejected: 'rejected',
  accounted: 'accounted',
  cancelled: 'cancelled',
} as const;

interface EmployeeFilterCardProps {
  dict: Dictionary;
  fetchTime: Date;
}

export default function EmployeeFilterCard({
  dict,
  fetchTime,
}: EmployeeFilterCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isPendingSearch, setIsPendingSearch] = useState(false);

  // Filter states
  const [idFilter, setIdFilter] = useState(
    () => searchParams?.get('id') || '',
  );
  const [statusFilter, setStatusFilter] = useState<string[]>(() => {
    const param = searchParams?.get('status');
    return param ? param.split(',') : [];
  });
  const [yearFilter, setYearFilter] = useState<string[]>(() => {
    const param = searchParams?.get('year');
    return param ? param.split(',') : [];
  });
  const [monthFilter, setMonthFilter] = useState<string[]>(() => {
    const param = searchParams?.get('month');
    return param ? param.split(',') : [];
  });
  const [weekFilter, setWeekFilter] = useState<string[]>(() => {
    const param = searchParams?.get('week');
    return param ? param.split(',') : [];
  });

  useEffect(() => {
    setIsPendingSearch(false);
  }, [fetchTime]);

  // Year options
  const yearOptions = (() => {
    const options = [];
    const currentYear = new Date().getFullYear();
    const startYear = 2025;
    for (let year = startYear; year <= currentYear; year++) {
      options.push({ value: year.toString(), label: year.toString() });
    }
    return options.reverse();
  })();

  // Month options - use selected years or current year as default
  const monthOptions = (() => {
    const options = [];
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const absoluteStartYear = 2025;

    const yearsToInclude =
      yearFilter.length > 0
        ? yearFilter.map((y) => parseInt(y)).sort((a, b) => a - b)
        : [currentYear];

    for (const year of yearsToInclude) {
      const monthStart = year === absoluteStartYear ? 5 : 0;
      const monthEnd = year === currentYear ? currentMonth : 11;
      for (let month = monthStart; month <= monthEnd; month++) {
        const monthStr = (month + 1).toString().padStart(2, '0');
        const yearStr = year.toString();
        const value = `${yearStr}-${monthStr}`;
        const monthName = dict.months[monthStr as keyof typeof dict.months];
        options.push({
          value,
          label: `${monthName} - ${monthStr}.${yearStr}`,
        });
      }
    }
    return options.reverse();
  })();

  // Week options
  const generateWeekOptionsForYear = (year: number) => {
    const options = [];
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

    const firstDayOfYear = new Date(year, 0, 1);
    const lastDayOfYear = new Date(year, 11, 31);
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

  const weekOptions = (() => {
    const currentYear = new Date().getFullYear();
    // Use selected year or default to current year (only single year supported for weeks)
    const year = yearFilter.length === 1 ? parseInt(yearFilter[0]) : currentYear;
    const allWeeks = generateWeekOptionsForYear(year);
    if (monthFilter.length === 0) return allWeeks;

    return allWeeks.filter((weekOption) => {
      const [, weekPart] = weekOption.value.split('-W');
      const weekNum = parseInt(weekPart);

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

      const monday = getFirstDayOfISOWeek(year, weekNum);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

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
  })();

  const handleYearFilterChange = (values: string[]) => {
    setYearFilter(values);
  };

  const handleClearFilters = () => {
    setIdFilter('');
    setStatusFilter([]);
    setYearFilter([]);
    setMonthFilter([]);
    setWeekFilter([]);
    if (searchParams?.toString()) {
      setIsPendingSearch(true);
      router.push(pathname || '');
    }
  };

  const handleSearchClick = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (idFilter) params.set('id', idFilter);
    if (statusFilter.length > 0) params.set('status', statusFilter.join(','));
    if (yearFilter.length > 0) params.set('year', yearFilter.join(','));
    if (monthFilter.length > 0) params.set('month', monthFilter.join(','));
    if (weekFilter.length > 0) params.set('week', weekFilter.join(','));
    setIsPendingSearch(true);
    router.push(`${pathname}?${params.toString()}`);
  };

  const hasActiveFilters = Boolean(
    idFilter ||
      statusFilter.length > 0 ||
      yearFilter.length > 0 ||
      monthFilter.length > 0 ||
      weekFilter.length > 0 ||
      searchParams?.toString(),
  );

  return (
    <Card>
      <CardContent className='p-4 pt-4'>
        <form onSubmit={handleSearchClick} className='flex flex-col gap-4'>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5'>
            {/* ID search */}
            <div className='flex flex-col space-y-1'>
              <Label>ID</Label>
              <Input
                value={idFilter}
                onChange={(e) => setIdFilter(e.target.value)}
                placeholder='ID...'
                className='w-full'
              />
            </div>

            {/* Status */}
            <div className='flex flex-col space-y-1'>
              <Label>{dict.filters?.status || 'Status'}</Label>
              <MultiSelect
                value={statusFilter}
                onValueChange={setStatusFilter}
                placeholder={dict.filters?.select || 'Select'}
                searchPlaceholder={dict.filters?.searchPlaceholder || 'search...'}
                emptyText={dict.filters?.notFound || 'not found'}
                clearLabel={dict.filters?.clearFilter || 'clear'}
                selectedLabel={dict.filters?.selected || 'selected'}
                className='w-full'
                options={OVERTIME_FILTER_STATUSES.map((status) => ({
                  value: status,
                  label: dict.status[STATUS_DICT_KEYS[status]],
                }))}
              />
            </div>

            {/* Year */}
            <div className='flex flex-col space-y-1'>
              <Label>{dict.filters?.year || 'Year'}</Label>
              <MultiSelect
                value={yearFilter}
                onValueChange={handleYearFilterChange}
                placeholder={dict.filters?.select || 'Select'}
                searchPlaceholder={dict.filters?.searchPlaceholder || 'search...'}
                emptyText={dict.filters?.notFound || 'not found'}
                clearLabel={dict.filters?.clearFilter || 'clear'}
                selectedLabel={dict.filters?.selected || 'selected'}
                className='w-full'
                options={yearOptions}
              />
            </div>

            {/* Month */}
            <div className='flex flex-col space-y-1'>
              <Label>{dict.filters?.month || 'Month'}</Label>
              <MultiSelect
                value={monthFilter}
                onValueChange={setMonthFilter}
                placeholder={dict.filters?.select || 'Select'}
                searchPlaceholder={dict.filters?.searchPlaceholder || 'search...'}
                emptyText={dict.filters?.notFound || 'not found'}
                clearLabel={dict.filters?.clearFilter || 'clear'}
                selectedLabel={dict.filters?.selected || 'selected'}
                className='w-full'
                options={monthOptions}
              />
            </div>

            {/* Week */}
            <div className='flex flex-col space-y-1'>
              <Label>{dict.filters?.week || 'Week'}</Label>
              <MultiSelect
                value={weekFilter}
                onValueChange={setWeekFilter}
                placeholder={dict.filters?.select || 'Select'}
                searchPlaceholder={dict.filters?.searchPlaceholder || 'search...'}
                emptyText={dict.filters?.notFound || 'not found'}
                clearLabel={dict.filters?.clearFilter || 'clear'}
                selectedLabel={dict.filters?.selected || 'selected'}
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
              disabled={isPendingSearch || !hasActiveFilters}
              className='order-2 w-full sm:order-1 sm:w-auto'
            >
              <CircleX /> <span>{dict.filters?.clear || 'Clear'}</span>
            </Button>

            <Button
              type='submit'
              variant='secondary'
              disabled={isPendingSearch || !hasActiveFilters}
              className='order-1 w-full sm:order-2 sm:w-auto'
            >
              {isPendingSearch ? (
                <Loader className='animate-spin' />
              ) : (
                <Search />
              )}
              <span>{dict.filters?.search || 'Search'}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
