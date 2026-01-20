'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DateTimeInput } from '@/components/ui/datetime-input';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import { Switch } from '@/components/ui/switch';
import { UsersListType } from '@/lib/types/user';
import { CircleX, Loader, Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { revalidateOvertimeOrders as revalidate } from '../actions/utils';
import { Dictionary } from '../lib/dict';
import { DepartmentConfig } from '../lib/types';

export default function TableFilteringAndOptions({
  fetchTime,
  isGroupLeader,
  isLogged,
  userEmail,
  dict,
  departments,
  users,
  lang,
}: {
  fetchTime: Date;
  isGroupLeader: boolean;
  isLogged: boolean;
  userEmail?: string;
  dict: Dictionary;
  departments?: DepartmentConfig[];
  users: UsersListType;
  lang?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isPendingSearch, setIsPendingSearch] = useState(false);

  useEffect(() => {
    setIsPendingSearch(false);
  }, [fetchTime]);

  const [showOnlyMine, setShowOnlyMine] = useState(() => {
    const requestedBy = searchParams?.get('requestedBy');
    return requestedBy === userEmail;
  });

  const [showOnlyResponsible, setShowOnlyResponsible] = useState(() => {
    const responsibleEmployee = searchParams?.get('responsibleEmployee');
    return responsibleEmployee === userEmail;
  });

  const [showPendingApproval, setShowPendingApproval] = useState(() => {
    const status = searchParams?.get('status');
    return status === 'pending';
  });

  const [dateFilter, setDateFilter] = useState(() => {
    const dateParam = searchParams?.get('date');
    return dateParam ? new Date(dateParam) : undefined;
  });
  const [statusFilter, setStatusFilter] = useState<string[]>(() => {
    const statusParam = searchParams?.get('status');
    return statusParam ? statusParam.split(',') : [];
  });
  const [departmentFilter, setDepartmentFilter] = useState<string[]>(() => {
    const departmentParam = searchParams?.get('department');
    return departmentParam ? departmentParam.split(',') : [];
  });
  const [idFilter, setIdFilter] = useState(searchParams?.get('id') || '');
  const [createdByFilter, setCreatedByFilter] = useState<string[]>(() => {
    const createdByParam = searchParams?.get('createdBy');
    return createdByParam ? createdByParam.split(',') : [];
  });
  const [responsiblePersonFilter, setResponsiblePersonFilter] = useState<
    string[]
  >(() => {
    const responsiblePersonParam = searchParams?.get('responsiblePerson');
    return responsiblePersonParam ? responsiblePersonParam.split(',') : [];
  });

  const [yearFilter, setYearFilter] = useState<string[]>(() => {
    const yearParam = searchParams?.get('year');
    return yearParam ? yearParam.split(',') : [];
  });

  const [monthFilter, setMonthFilter] = useState<string[]>(() => {
    const monthParam = searchParams?.get('month');
    return monthParam ? monthParam.split(',') : [];
  });

  const [weekFilter, setWeekFilter] = useState<string[]>(() => {
    const weekParam = searchParams?.get('week');
    return weekParam ? weekParam.split(',') : [];
  });

  // Sync showPendingApproval with statusFilter changes
  useEffect(() => {
    if (statusFilter.length === 1 && statusFilter[0] === 'pending') {
      setShowPendingApproval(true);
    } else if (statusFilter.length === 0 || !statusFilter.includes('pending')) {
      setShowPendingApproval(false);
    }
  }, [statusFilter]);

  // Generate year options
  const yearOptions = (() => {
    const options = [];
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();

    // Start from 2025
    const startYear = 2025;

    for (let year = startYear; year <= currentYear; year++) {
      options.push({
        value: year.toString(),
        label: year.toString(),
      });
    }

    // Reverse to show most recent years first
    return options.reverse();
  })();

  // Generate month options - use selected years or current year as default
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
      const monthStart = year === absoluteStartYear ? 5 : 0; // June (month index 5)
      const monthEnd = year === currentYear ? currentMonth : 11; // December or current month

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

    // Reverse to show most recent months first
    return options.reverse();
  })();

  // Generate week options for selected year
  const generateWeekOptionsForYear = (year: number) => {
    const options = [];
    const firstDayOfYear = new Date(year, 0, 1);
    const lastDayOfYear = new Date(year, 11, 31);

    // Helper function to get ISO week number
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

    // Helper function to get Monday of ISO week
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

    // Determine week range for the year
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
        label = `${dict.tableFiltering.weekLabel || 'Week'} ${week}: ${mondayDay}-${sundayDay}.${mondayMonth.toString().padStart(2, '0')}`;
      } else {
        label = `${dict.tableFiltering.weekLabel || 'Week'} ${week}: ${mondayDay}.${mondayMonth.toString().padStart(2, '0')}-${sundayDay}.${sundayMonth.toString().padStart(2, '0')}`;
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

  // Handle year filter change with dependent filter logic
  const handleYearFilterChange = (values: string[]) => {
    setYearFilter(values);
    // If no years selected, clear month and week filters
    if (values.length === 0) {
      if (monthFilter.length > 0) {
        setMonthFilter([]);
      }
      if (weekFilter.length > 0) {
        setWeekFilter([]);
      }
    }
    // If not exactly 1 year selected, clear week filter
    else if (values.length !== 1 && weekFilter.length > 0) {
      setWeekFilter([]);
    }
  };

  // Handle week filter change
  const handleWeekFilterChange = (values: string[]) => {
    setWeekFilter(values);
  };

  // Handle month filter change
  const handleMonthFilterChange = (values: string[]) => {
    setMonthFilter(values);
  };

  const handleClearFilters = () => {
    setDateFilter(undefined);
    setStatusFilter([]);
    setDepartmentFilter([]);
    setIdFilter('');
    setCreatedByFilter([]);
    setResponsiblePersonFilter([]);
    setYearFilter([]);
    setMonthFilter([]);
    setWeekFilter([]);
    setShowOnlyMine(false);
    setShowOnlyResponsible(false);
    setShowPendingApproval(false);
    if (searchParams?.toString()) {
      setIsPendingSearch(true);
      router.push(pathname || '');
    }
  };

  const handleSearchClick = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (dateFilter) params.set('date', dateFilter.toISOString());
    if (statusFilter.length > 0) params.set('status', statusFilter.join(','));
    if (departmentFilter.length > 0)
      params.set('department', departmentFilter.join(','));
    if (idFilter) params.set('id', idFilter);
    if (createdByFilter.length > 0)
      params.set('createdBy', createdByFilter.join(','));
    if (responsiblePersonFilter.length > 0)
      params.set('responsiblePerson', responsiblePersonFilter.join(','));
    if (yearFilter.length > 0) params.set('year', yearFilter.join(','));
    if (monthFilter.length > 0) params.set('month', monthFilter.join(','));
    if (weekFilter.length > 0) params.set('week', weekFilter.join(','));
    if (showOnlyMine) params.set('requestedBy', userEmail || '');
    if (showOnlyResponsible) params.set('responsibleEmployee', userEmail || '');
    const newUrl = `${pathname}?${params.toString()}`;
    if (newUrl !== `${pathname}?${searchParams?.toString()}`) {
      setIsPendingSearch(true);
      router.push(newUrl);
    } else {
      setIsPendingSearch(true);
      revalidate();
    }
  };

  const handleShowOnlyMineChange = (checked: boolean) => {
    setShowOnlyMine(checked);
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (checked) {
      params.set('requestedBy', userEmail || '');
    } else {
      params.delete('requestedBy');
    }
    setIsPendingSearch(true);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleShowOnlyResponsibleChange = (checked: boolean) => {
    setShowOnlyResponsible(checked);
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (checked) {
      params.set('responsibleEmployee', userEmail || '');
    } else {
      params.delete('responsibleEmployee');
    }
    setIsPendingSearch(true);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleShowPendingApprovalChange = (checked: boolean) => {
    setShowPendingApproval(checked);
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (checked) {
      params.set('status', 'pending');
      setStatusFilter(['pending']);
    } else {
      params.delete('status');
      setStatusFilter([]);
    }
    setIsPendingSearch(true);
    router.push(`${pathname}?${params.toString()}`);
  };

  // Check if any filter is active or if there are pending changes
  const hasActiveFilters = Boolean(
    dateFilter ||
      statusFilter.length > 0 ||
      departmentFilter.length > 0 ||
      idFilter ||
      createdByFilter.length > 0 ||
      responsiblePersonFilter.length > 0 ||
      yearFilter.length > 0 ||
      monthFilter.length > 0 ||
      weekFilter.length > 0 ||
      showOnlyMine ||
      showOnlyResponsible ||
      showPendingApproval,
  );

  // Check if local state differs from URL (pending changes to apply)
  const hasPendingChanges = (() => {
    const urlDate = searchParams?.get('date');
    const urlStatus = searchParams?.get('status')?.split(',') || [];
    const urlDepartment = searchParams?.get('department')?.split(',') || [];
    const urlId = searchParams?.get('id') || '';
    const urlCreatedBy = searchParams?.get('createdBy')?.split(',') || [];
    const urlResponsiblePerson =
      searchParams?.get('responsiblePerson')?.split(',') || [];
    const urlYear = searchParams?.get('year')?.split(',') || [];
    const urlMonth = searchParams?.get('month')?.split(',') || [];
    const urlWeek = searchParams?.get('week')?.split(',') || [];

    const dateChanged = (dateFilter?.toISOString() || '') !== (urlDate || '');
    const statusChanged =
      JSON.stringify(statusFilter.sort()) !== JSON.stringify(urlStatus.sort());
    const departmentChanged =
      JSON.stringify(departmentFilter.sort()) !==
      JSON.stringify(urlDepartment.sort());
    const idChanged = idFilter !== urlId;
    const createdByChanged =
      JSON.stringify(createdByFilter.sort()) !==
      JSON.stringify(urlCreatedBy.sort());
    const responsiblePersonChanged =
      JSON.stringify(responsiblePersonFilter.sort()) !==
      JSON.stringify(urlResponsiblePerson.sort());
    const yearChanged =
      JSON.stringify(yearFilter.sort()) !== JSON.stringify(urlYear.sort());
    const monthChanged =
      JSON.stringify(monthFilter.sort()) !== JSON.stringify(urlMonth.sort());
    const weekChanged =
      JSON.stringify(weekFilter.sort()) !== JSON.stringify(urlWeek.sort());

    return (
      dateChanged ||
      statusChanged ||
      departmentChanged ||
      idChanged ||
      createdByChanged ||
      responsiblePersonChanged ||
      yearChanged ||
      monthChanged ||
      weekChanged
    );
  })();

  const canSearch = hasActiveFilters || hasPendingChanges;

  return (
    <Card>
      <CardHeader className='p-4'>
        {isLogged && (
          <div className='flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4 sm:flex-wrap'>
            <div className='flex items-center space-x-2'>
              <Switch
                id='only-my-requests'
                checked={showOnlyMine}
                onCheckedChange={handleShowOnlyMineChange}
              />
              <Label htmlFor='only-my-requests'>
                {dict.tableFiltering.myRequests}
              </Label>
            </div>
            <div className='flex items-center space-x-2'>
              <Switch
                id='only-responsible'
                checked={showOnlyResponsible}
                onCheckedChange={handleShowOnlyResponsibleChange}
              />
              <Label htmlFor='only-responsible'>
                {dict.tableFiltering.iAmResponsible}
              </Label>
            </div>
            <div className='flex items-center space-x-2'>
              <Switch
                id='pending-approval'
                checked={showPendingApproval}
                onCheckedChange={handleShowPendingApprovalChange}
              />
              <Label htmlFor='pending-approval'>
                {dict.tableFiltering.pendingApproval}
              </Label>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className='p-4 pt-4'>
        <form onSubmit={handleSearchClick} className='flex flex-col gap-4'>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            {/* ID */}
            <div className='flex flex-col space-y-1'>
              <Label>ID</Label>
              <Input
                value={idFilter}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setIdFilter(e.target.value)
                }
                className='w-full'
              />
            </div>

            {/* Status */}
            <div className='flex flex-col space-y-1'>
              <Label>{dict.tableFiltering.status}</Label>
              <MultiSelect
                value={statusFilter}
                onValueChange={setStatusFilter}
                placeholder={dict.common.select}
                searchPlaceholder={dict.common.search}
                emptyText={dict.tableFiltering.notFound}
                clearLabel={dict.common.clear}
                selectedLabel={dict.tableFiltering.selected}
                className='w-full'
                options={[
                  {
                    value: 'pending',
                    label: dict.tableColumns.statuses.pending,
                  },
                  {
                    value: 'pre_approved',
                    label: dict.tableColumns.statuses.preApproved,
                  },
                  {
                    value: 'approved',
                    label: dict.tableColumns.statuses.approved,
                  },
                  {
                    value: 'canceled',
                    label: dict.tableColumns.statuses.canceled,
                  },
                  {
                    value: 'completed',
                    label: dict.tableColumns.statuses.completed,
                  },
                  {
                    value: 'accounted',
                    label: dict.tableColumns.statuses.accounted,
                  },
                ]}
              />
            </div>

            {/* Department */}
            <div className='flex flex-col space-y-1'>
              <Label>{dict.department.label}</Label>
              <MultiSelect
                value={departmentFilter}
                onValueChange={setDepartmentFilter}
                placeholder={dict.common.select}
                searchPlaceholder={dict.common.search}
                emptyText={dict.tableFiltering.notFound}
                clearLabel={dict.common.clear}
                selectedLabel={dict.tableFiltering.selected}
                className='w-full'
                options={
                  departments?.map((dept) => ({
                    value: dept.value,
                    label:
                      lang === 'pl'
                        ? dept.namePl
                        : lang === 'de'
                          ? dept.nameDe
                          : dept.name,
                  })) || []
                }
              />
            </div>

            {/* Created By */}
            <div className='flex flex-col space-y-1'>
              <Label>{dict.tableFiltering.createdBy}</Label>
              <MultiSelect
                value={createdByFilter}
                onValueChange={setCreatedByFilter}
                placeholder={dict.common.select}
                searchPlaceholder={dict.tableFiltering.searchByName}
                emptyText={dict.tableFiltering.notFound}
                clearLabel={dict.common.clear}
                selectedLabel={dict.tableFiltering.selected}
                className='w-full'
                options={
                  users?.map((user) => ({
                    value: user.email,
                    label: user.name,
                  })) || []
                }
              />
            </div>

            {/* Responsible Person */}
            <div className='flex flex-col space-y-1'>
              <Label>{dict.tableFiltering.responsiblePerson}</Label>
              <MultiSelect
                value={responsiblePersonFilter}
                onValueChange={setResponsiblePersonFilter}
                placeholder={dict.common.select}
                searchPlaceholder={dict.tableFiltering.searchByName}
                emptyText={dict.tableFiltering.notFound}
                clearLabel={dict.common.clear}
                selectedLabel={dict.tableFiltering.selected}
                className='w-full'
                options={
                  users?.map((user) => ({
                    value: user.email,
                    label: user.name,
                  })) || []
                }
              />
            </div>

            {/* Deadline */}
            <div className='flex flex-col space-y-1'>
              <Label>{dict.tableFiltering.deadline}</Label>
              <DateTimePicker
                value={dateFilter}
                onChange={setDateFilter}
                hideTime
                renderTrigger={({ value, setOpen, open }) => (
                  <DateTimeInput
                    value={value}
                    onChange={(x) => !open && setDateFilter(x)}
                    format='dd/MM/yyyy'
                    disabled={open}
                    onCalendarClick={() => setOpen(!open)}
                    className='w-full'
                  />
                )}
              />
            </div>

            {/* Year */}
            <div className='flex flex-col space-y-1'>
              <Label>{dict.tableFiltering.year}</Label>
              <MultiSelect
                value={yearFilter}
                onValueChange={handleYearFilterChange}
                placeholder={dict.common.select}
                searchPlaceholder={dict.common.search}
                emptyText={dict.tableFiltering.notFound}
                clearLabel={dict.common.clear}
                selectedLabel={dict.tableFiltering.selected}
                className='w-full'
                options={yearOptions}
              />
            </div>

            {/* Month */}
            <div className='flex flex-col space-y-1'>
              <Label>{dict.tableFiltering.month}</Label>
              <MultiSelect
                value={monthFilter}
                onValueChange={handleMonthFilterChange}
                placeholder={dict.common.select}
                searchPlaceholder={dict.common.search}
                emptyText={dict.tableFiltering.notFound}
                clearLabel={dict.common.clear}
                selectedLabel={dict.tableFiltering.selected}
                className='w-full'
                options={monthOptions}
              />
            </div>

            {/* Week */}
            <div className='flex flex-col space-y-1'>
              <Label>{dict.tableFiltering.week}</Label>
              <MultiSelect
                value={weekFilter}
                onValueChange={handleWeekFilterChange}
                placeholder={dict.common.select}
                searchPlaceholder={dict.common.search}
                emptyText={dict.tableFiltering.notFound}
                clearLabel={dict.common.clear}
                selectedLabel={dict.tableFiltering.selected}
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
              title='Clear filters'
              disabled={isPendingSearch || !canSearch}
              className='order-2 w-full sm:order-1 sm:w-auto'
            >
              <CircleX /> <span>{dict.common.clear}</span>
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
              <span>{dict.common.search}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
