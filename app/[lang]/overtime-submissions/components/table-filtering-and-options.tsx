'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import { Switch } from '@/components/ui/switch';
import { CircleX, Loader, Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { revalidateOvertime as revalidate } from '../actions/utils';
import { Dictionary } from '../lib/dict';
import { OVERTIME_FILTER_STATUSES } from '../lib/types';

// Map status values to dictionary keys
const STATUS_DICT_KEYS: Record<typeof OVERTIME_FILTER_STATUSES[number], keyof Dictionary['status']> = {
  'pending': 'pending',
  'pending-plant-manager': 'pendingPlantManager',
  'approved': 'approved',
  'rejected': 'rejected',
  'accounted': 'accounted',
} as const;

export default function TableFilteringAndOptions({
  fetchTime,
  ordersCount = 0,
  notOrdersCount = 0,
  dict,
}: {
  fetchTime: Date;
  ordersCount?: number;
  notOrdersCount?: number;
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

  const [onlyOrders, setOnlyOrders] = useState(() => {
    const param = searchParams?.get('onlyOrders');
    return param === 'true';
  });

  const [notOrders, setNotOrders] = useState(() => {
    const param = searchParams?.get('notOrders');
    return param === 'true';
  });

  const [idFilter, setIdFilter] = useState(() => {
    return searchParams?.get('id') || '';
  });

  const handleOnlyOrdersChange = (checked: boolean) => {
    setOnlyOrders(checked);
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (checked) {
      params.set('onlyOrders', 'true');
      // Mutually exclusive with notOrders
      params.delete('notOrders');
      setNotOrders(false);
    } else {
      params.delete('onlyOrders');
    }
    setIsPendingSearch(true);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleNotOrdersChange = (checked: boolean) => {
    setNotOrders(checked);
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (checked) {
      params.set('notOrders', 'true');
      // Mutually exclusive with onlyOrders
      params.delete('onlyOrders');
      setOnlyOrders(false);
    } else {
      params.delete('notOrders');
    }
    setIsPendingSearch(true);
    router.push(`${pathname}?${params.toString()}`);
  };

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

  // Generate month options - only for selected years
  const monthOptions = (() => {
    const options = [];
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const absoluteStartYear = 2025;

    if (yearFilter.length === 0) {
      return [];
    }

    const yearsToInclude = yearFilter.map((y) => parseInt(y)).sort((a, b) => a - b);

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

  // Week options - available when year selected, optionally filtered by month
  const weekOptions = (() => {
    if (yearFilter.length !== 1) {
      return [];
    }

    const year = parseInt(yearFilter[0]);
    const allWeeks = generateWeekOptionsForYear(year);

    if (monthFilter.length === 0) {
      return allWeeks;
    }

    const filteredWeeks = allWeeks.filter((weekOption) => {
      const [yearStr, weekPart] = weekOption.value.split('-W');
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

    return filteredWeeks;
  })();

  const isWeekFilterDisabled = yearFilter.length !== 1;

  const handleClearFilters = () => {
    setMonthFilter([]);
    setWeekFilter([]);
    setYearFilter([]);
    setStatusFilter([]);
    setOnlyOrders(false);
    setNotOrders(false);
    setIdFilter('');
    if (searchParams?.toString()) {
      setIsPendingSearch(true);
      router.push(pathname || '');
    }
  };

  const handleYearFilterChange = (values: string[]) => {
    setYearFilter(values);
    if (values.length === 0) {
      if (monthFilter.length > 0) {
        setMonthFilter([]);
      }
      if (weekFilter.length > 0) {
        setWeekFilter([]);
      }
    } else if (values.length !== 1 && weekFilter.length > 0) {
      setWeekFilter([]);
    }
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
    if (onlyOrders) params.set('onlyOrders', 'true');
    if (notOrders) params.set('notOrders', 'true');
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
    onlyOrders ||
    notOrders ||
    idFilter ||
    searchParams?.toString()
  );

  return (
    <Card>
      <CardHeader className='p-4'>
        <div className='flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4 sm:flex-wrap'>
          <div className='flex items-center space-x-2'>
            <Switch
              id='overtime-only'
              checked={notOrders}
              onCheckedChange={handleNotOrdersChange}
            />
            <Label htmlFor='overtime-only'>
              {dict.filters.overtimeOnly || 'Overtime'}
              {notOrdersCount > 0 && ` (${notOrdersCount})`}
            </Label>
          </div>
          <div className='flex items-center space-x-2'>
            <Switch
              id='only-orders'
              checked={onlyOrders}
              onCheckedChange={handleOnlyOrdersChange}
            />
            <Label htmlFor='only-orders'>
              {dict.filters.orders || 'Orders'}
              {ordersCount > 0 && ` (${ordersCount})`}
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent className='p-4 pt-4'>
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
                  label: dict.status[STATUS_DICT_KEYS[status]],
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
              <Label>{yearFilter.length === 0 ? dict.filters.monthHint : dict.filters.month}</Label>
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
                disabled={yearFilter.length === 0}
              />
            </div>
            <div className='flex flex-col space-y-1'>
              <Label>{isWeekFilterDisabled ? dict.filters.weekHint : dict.filters.week}</Label>
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
                disabled={isWeekFilterDisabled}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className='flex flex-col gap-2 sm:grid sm:grid-cols-2 sm:gap-4'>
            <Button
              type='button'
              variant='destructive'
              onClick={handleClearFilters}
              title={dict.filters.clear}
              disabled={isPendingSearch || !hasActiveFilters}
              className='order-2 w-full sm:order-1'
            >
              <CircleX /> <span>{dict.filters.clear}</span>
            </Button>

            <Button
              type='submit'
              variant='secondary'
              disabled={isPendingSearch || !hasActiveFilters}
              className='order-1 w-full sm:order-2'
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
