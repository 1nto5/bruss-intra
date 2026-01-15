'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import { Switch } from '@/components/ui/switch';
import { UsersListType } from '@/lib/types/user';
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

interface AllEntriesFilterCardProps {
  users: UsersListType;
  supervisors: UsersListType;
  dict: Dictionary;
  fetchTime: Date;
  showSupervisorFilter: boolean;
  showNotSettledFilter: boolean;
  isPlantManager: boolean;
}

export default function AllEntriesFilterCard({
  users,
  supervisors,
  dict,
  fetchTime,
  showSupervisorFilter,
  showNotSettledFilter,
  isPlantManager,
}: AllEntriesFilterCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isPendingSearch, setIsPendingSearch] = useState(false);

  // Filter states
  const [idFilter, setIdFilter] = useState(
    () => searchParams?.get('id') || '',
  );
  const [employeeFilter, setEmployeeFilter] = useState<string[]>(() => {
    const param = searchParams?.get('employee');
    return param ? param.split(',') : [];
  });
  const [supervisorFilter, setSupervisorFilter] = useState<string[]>(() => {
    const param = searchParams?.get('supervisor');
    return param ? param.split(',') : [];
  });
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

  // Toggle states
  const [onlyOrders, setOnlyOrders] = useState(() => {
    return searchParams?.get('onlyOrders') === 'true';
  });
  const [notOrders, setNotOrders] = useState(() => {
    return searchParams?.get('notOrders') === 'true';
  });
  const [notSettled, setNotSettled] = useState(() => {
    return searchParams?.get('notSettled') === 'true';
  });
  const [requiresMyApproval, setRequiresMyApproval] = useState(() => {
    return searchParams?.get('requiresMyApproval') === 'true';
  });

  useEffect(() => {
    setIsPendingSearch(false);
  }, [fetchTime]);

  // Employee options from users
  const employeeOptions = users.map((u) => ({
    value: u.email,
    label: u.name,
  }));

  // Supervisor options (filtered by role)
  const supervisorOptions = supervisors.map((u) => ({
    value: u.email,
    label: u.name,
  }));

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
    if (yearFilter.length !== 1) return [];
    const year = parseInt(yearFilter[0]);
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

  const isWeekFilterDisabled = yearFilter.length !== 1;

  const handleYearFilterChange = (values: string[]) => {
    setYearFilter(values);
    if (values.length === 0) {
      setMonthFilter([]);
      setWeekFilter([]);
    } else if (values.length !== 1) {
      setWeekFilter([]);
    }
  };

  const handleToggleChange = (
    toggle: 'onlyOrders' | 'notOrders' | 'notSettled' | 'requiresMyApproval',
    checked: boolean,
  ) => {
    const params = new URLSearchParams(searchParams?.toString() || '');

    if (toggle === 'onlyOrders') {
      setOnlyOrders(checked);
      if (checked) {
        params.set('onlyOrders', 'true');
        params.delete('notOrders');
        setNotOrders(false);
      } else {
        params.delete('onlyOrders');
      }
    } else if (toggle === 'notOrders') {
      setNotOrders(checked);
      if (checked) {
        params.set('notOrders', 'true');
        params.delete('onlyOrders');
        setOnlyOrders(false);
      } else {
        params.delete('notOrders');
      }
    } else if (toggle === 'notSettled') {
      setNotSettled(checked);
      if (checked) params.set('notSettled', 'true');
      else params.delete('notSettled');
    } else if (toggle === 'requiresMyApproval') {
      setRequiresMyApproval(checked);
      if (checked) params.set('requiresMyApproval', 'true');
      else params.delete('requiresMyApproval');
    }

    setIsPendingSearch(true);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClearFilters = () => {
    setIdFilter('');
    setEmployeeFilter([]);
    setSupervisorFilter([]);
    setStatusFilter([]);
    setYearFilter([]);
    setMonthFilter([]);
    setWeekFilter([]);
    setOnlyOrders(false);
    setNotOrders(false);
    setNotSettled(false);
    setRequiresMyApproval(false);
    if (searchParams?.toString()) {
      setIsPendingSearch(true);
      router.push(pathname || '');
    }
  };

  const handleSearchClick = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (idFilter) params.set('id', idFilter);
    if (employeeFilter.length > 0)
      params.set('employee', employeeFilter.join(','));
    if (supervisorFilter.length > 0)
      params.set('supervisor', supervisorFilter.join(','));
    if (statusFilter.length > 0) params.set('status', statusFilter.join(','));
    if (yearFilter.length > 0) params.set('year', yearFilter.join(','));
    if (monthFilter.length > 0) params.set('month', monthFilter.join(','));
    if (weekFilter.length > 0) params.set('week', weekFilter.join(','));
    if (onlyOrders) params.set('onlyOrders', 'true');
    if (notOrders) params.set('notOrders', 'true');
    if (notSettled) params.set('notSettled', 'true');
    if (requiresMyApproval) params.set('requiresMyApproval', 'true');
    setIsPendingSearch(true);
    router.push(`${pathname}?${params.toString()}`);
  };

  const hasActiveFilters = Boolean(
    idFilter ||
      employeeFilter.length > 0 ||
      supervisorFilter.length > 0 ||
      statusFilter.length > 0 ||
      yearFilter.length > 0 ||
      monthFilter.length > 0 ||
      weekFilter.length > 0 ||
      onlyOrders ||
      notOrders ||
      notSettled ||
      requiresMyApproval ||
      searchParams?.toString(),
  );

  return (
    <Card>
      <CardHeader className='p-4'>
        <div className='flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4 sm:flex-wrap'>
          <div className='flex items-center space-x-2'>
            <Switch
              id='requires-my-approval'
              checked={requiresMyApproval}
              onCheckedChange={(checked) =>
                handleToggleChange('requiresMyApproval', checked)
              }
            />
            <Label htmlFor='requires-my-approval'>
              {dict.allEntriesPage?.requiresMyApproval || 'Requires my approval'}
            </Label>
          </div>
          {showNotSettledFilter && (
            <div className='flex items-center space-x-2'>
              <Switch
                id='not-settled'
                checked={notSettled}
                onCheckedChange={(checked) =>
                  handleToggleChange('notSettled', checked)
                }
              />
              <Label htmlFor='not-settled'>
                {dict.allEntriesPage?.notSettled || 'Not settled'}
              </Label>
            </div>
          )}
          <div className='flex items-center space-x-2'>
            <Switch
              id='only-orders'
              checked={onlyOrders}
              onCheckedChange={(checked) =>
                handleToggleChange('onlyOrders', checked)
              }
            />
            <Label htmlFor='only-orders'>
              {dict.filters?.orders || 'Orders'}
            </Label>
          </div>
          <div className='flex items-center space-x-2'>
            <Switch
              id='not-orders'
              checked={notOrders}
              onCheckedChange={(checked) =>
                handleToggleChange('notOrders', checked)
              }
            />
            <Label htmlFor='not-orders'>
              {dict.filters?.overtimeOnly || 'Overtime'}
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent className='p-4 pt-4'>
        <form onSubmit={handleSearchClick} className='flex flex-col gap-4'>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
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

            {/* Employee multiselect */}
            <div className='flex flex-col space-y-1'>
              <Label>{dict.allEntriesPage?.employee || 'Employee'}</Label>
              <MultiSelect
                value={employeeFilter}
                onValueChange={setEmployeeFilter}
                placeholder={dict.filters?.select || 'Select'}
                searchPlaceholder={dict.filters?.searchPlaceholder || 'search...'}
                emptyText={dict.filters?.notFound || 'not found'}
                clearLabel={dict.filters?.clearFilter || 'clear'}
                selectedLabel={dict.filters?.selected || 'selected'}
                className='w-full'
                options={employeeOptions}
              />
            </div>

            {/* Supervisor multiselect - admin/HR/PM only */}
            {showSupervisorFilter && (
              <div className='flex flex-col space-y-1'>
                <Label>{dict.allEntriesPage?.supervisor || 'Supervisor'}</Label>
                <MultiSelect
                  value={supervisorFilter}
                  onValueChange={setSupervisorFilter}
                  placeholder={dict.filters?.select || 'Select'}
                  searchPlaceholder={dict.filters?.searchPlaceholder || 'search...'}
                  emptyText={dict.filters?.notFound || 'not found'}
                  clearLabel={dict.filters?.clearFilter || 'clear'}
                  selectedLabel={dict.filters?.selected || 'selected'}
                  className='w-full'
                  options={supervisorOptions}
                />
              </div>
            )}

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
                disabled={isWeekFilterDisabled}
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
