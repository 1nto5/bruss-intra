'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import { Switch } from '@/components/ui/switch';
import { UsersListType } from '@/lib/types/user';
import { CircleX, Loader, Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Dictionary } from '../lib/dict';

interface BalancesFilterCardProps {
  users: UsersListType;
  supervisors: UsersListType;
  dict: Dictionary;
  fetchTime: Date;
  showSupervisorFilter: boolean;
}

export default function BalancesFilterCard({
  users,
  supervisors,
  dict,
  fetchTime,
  showSupervisorFilter,
}: BalancesFilterCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isPendingSearch, setIsPendingSearch] = useState(false);

  // Filter states
  const [employeeFilter, setEmployeeFilter] = useState<string[]>(() => {
    const param = searchParams?.get('employee');
    return param ? param.split(',') : [];
  });
  const [supervisorFilter, setSupervisorFilter] = useState<string[]>(() => {
    const param = searchParams?.get('supervisor');
    return param ? param.split(',') : [];
  });
  const [monthFilter, setMonthFilter] = useState<string[]>(() => {
    const param = searchParams?.get('month');
    return param ? param.split(',') : [];
  });

  // Toggle states
  const [onlyPending, setOnlyPending] = useState(() => {
    return searchParams?.get('onlyPending') === 'true';
  });
  const [onlyNonZero, setOnlyNonZero] = useState(() => {
    return searchParams?.get('onlyNonZero') === 'true';
  });
  const [onlyUnsettled, setOnlyUnsettled] = useState(() => {
    return searchParams?.get('onlyUnsettled') === 'true';
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

  // Month options - show all months from start year to current
  const monthOptions = (() => {
    const options = [];
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const startYear = 2025;

    for (let year = startYear; year <= currentYear; year++) {
      const monthStart = year === startYear ? 5 : 0;
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

  const handleToggleChange = (
    toggle: 'onlyPending' | 'onlyNonZero' | 'onlyUnsettled',
    checked: boolean,
  ) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (toggle === 'onlyPending') {
      setOnlyPending(checked);
      if (checked) params.set('onlyPending', 'true');
      else params.delete('onlyPending');
    } else if (toggle === 'onlyNonZero') {
      setOnlyNonZero(checked);
      if (checked) params.set('onlyNonZero', 'true');
      else params.delete('onlyNonZero');
    } else if (toggle === 'onlyUnsettled') {
      setOnlyUnsettled(checked);
      if (checked) params.set('onlyUnsettled', 'true');
      else params.delete('onlyUnsettled');
    }
    setIsPendingSearch(true);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClearFilters = () => {
    setEmployeeFilter([]);
    setSupervisorFilter([]);
    setMonthFilter([]);
    setOnlyPending(false);
    setOnlyNonZero(false);
    setOnlyUnsettled(false);
    if (searchParams?.toString()) {
      setIsPendingSearch(true);
      router.push(pathname || '');
    }
  };

  const handleSearchClick = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (employeeFilter.length > 0)
      params.set('employee', employeeFilter.join(','));
    if (supervisorFilter.length > 0)
      params.set('supervisor', supervisorFilter.join(','));
    if (monthFilter.length > 0) params.set('month', monthFilter.join(','));
    if (onlyPending) params.set('onlyPending', 'true');
    if (onlyNonZero) params.set('onlyNonZero', 'true');
    if (onlyUnsettled) params.set('onlyUnsettled', 'true');
    setIsPendingSearch(true);
    router.push(`${pathname}?${params.toString()}`);
  };

  const hasActiveFilters = Boolean(
    employeeFilter.length > 0 ||
      supervisorFilter.length > 0 ||
      monthFilter.length > 0 ||
      onlyPending ||
      onlyNonZero ||
      onlyUnsettled ||
      searchParams?.toString(),
  );

  return (
    <Card>
      <CardHeader className='p-4'>
        <div className='flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4 sm:flex-wrap'>
          <div className='flex items-center space-x-2'>
            <Switch
              id='only-pending'
              checked={onlyPending}
              onCheckedChange={(checked) =>
                handleToggleChange('onlyPending', checked)
              }
            />
            <Label htmlFor='only-pending'>
              {dict.balancesPage?.onlyPending || 'Pending'}
            </Label>
          </div>
          <div className='flex items-center space-x-2'>
            <Switch
              id='only-non-zero'
              checked={onlyNonZero}
              onCheckedChange={(checked) =>
                handleToggleChange('onlyNonZero', checked)
              }
            />
            <Label htmlFor='only-non-zero'>
              {dict.balancesPage?.onlyNonZero || 'Balance ≠ 0'}
            </Label>
          </div>
          <div className='flex items-center space-x-2'>
            <Switch
              id='only-unsettled'
              checked={onlyUnsettled}
              onCheckedChange={(checked) =>
                handleToggleChange('onlyUnsettled', checked)
              }
            />
            <Label htmlFor='only-unsettled'>
              {dict.balancesPage?.onlyUnsettled || 'Unsettled'}
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent className='p-4 pt-4'>
        <form onSubmit={handleSearchClick} className='flex flex-col gap-4'>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {/* Employee multiselect */}
            <div className='flex flex-col space-y-1'>
              <Label>{dict.filters?.employee || 'Employee'}</Label>
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
                <Label>{dict.balancesPage?.supervisor || 'Supervisor'}</Label>
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
