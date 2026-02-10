'use client';

import { DateTimeInput } from '@/components/ui/datetime-input';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { FilterActions } from '@/components/ui/filter-actions';
import { FilterCard, FilterCardContent } from '@/components/ui/filter-card';
import { FilterField } from '@/components/ui/filter-field';
import { FilterGrid } from '@/components/ui/filter-grid';
import { Input } from '@/components/ui/input';
import { MultiSelect } from '@/components/ui/multi-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { revalidateInventory } from '../actions/utils';
import { Dictionary } from '../lib/dict';
import { EQUIPMENT_CATEGORIES, EQUIPMENT_STATUSES } from '../lib/types';
import { EmployeeType } from '@/lib/types/employee-types';

export default function TableFiltering({
  dict,
  lang,
  fetchTime,
  employees,
}: {
  dict: Dictionary;
  lang: string;
  fetchTime: Date;
  employees: EmployeeType[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setIsSearching(false);
  }, [fetchTime]);

  // Restore filters from sessionStorage on mount if URL has no params
  useEffect(() => {
    if (!searchParams?.toString()) {
      const saved = sessionStorage.getItem('it-inventory-filters');
      if (saved) {
        router.replace(`${pathname}?${saved}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.getAll('category') || [],
  );
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    searchParams.getAll('status') || [],
  );
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>(
    searchParams.getAll('employee') || [],
  );
  const [assignmentStatus, setAssignmentStatus] = useState<string>(
    searchParams.get('assignmentStatus') || 'all',
  );
  const [search, setSearch] = useState<string>(
    searchParams.get('search') || '',
  );
  const [purchaseDateFrom, setPurchaseDateFrom] = useState<Date | undefined>(
    searchParams.get('purchaseDateFrom')
      ? new Date(searchParams.get('purchaseDateFrom')!)
      : undefined,
  );
  const [purchaseDateTo, setPurchaseDateTo] = useState<Date | undefined>(
    searchParams.get('purchaseDateTo')
      ? new Date(searchParams.get('purchaseDateTo')!)
      : undefined,
  );
  const [assignmentDateFrom, setAssignmentDateFrom] = useState<
    Date | undefined
  >(
    searchParams.get('assignmentDateFrom')
      ? new Date(searchParams.get('assignmentDateFrom')!)
      : undefined,
  );
  const [assignmentDateTo, setAssignmentDateTo] = useState<Date | undefined>(
    searchParams.get('assignmentDateTo')
      ? new Date(searchParams.get('assignmentDateTo')!)
      : undefined,
  );

  const applyFilters = () => {
    const params = new URLSearchParams();

    selectedCategories.forEach((cat) => params.append('category', cat));
    selectedStatuses.forEach((status) => params.append('status', status));
    selectedEmployees.forEach((emp) => params.append('employee', emp));

    if (assignmentStatus && assignmentStatus !== 'all') {
      params.set('assignmentStatus', assignmentStatus);
    }

    if (search) {
      params.set('search', search);
    }

    if (purchaseDateFrom) {
      params.set('purchaseDateFrom', purchaseDateFrom.toISOString());
    }

    if (purchaseDateTo) {
      params.set('purchaseDateTo', purchaseDateTo.toISOString());
    }

    if (assignmentDateFrom) {
      params.set('assignmentDateFrom', assignmentDateFrom.toISOString());
    }

    if (assignmentDateTo) {
      params.set('assignmentDateTo', assignmentDateTo.toISOString());
    }

    const paramsString = params.toString();
    if (paramsString) {
      sessionStorage.setItem('it-inventory-filters', paramsString);
    } else {
      sessionStorage.removeItem('it-inventory-filters');
    }

    const newUrl = `${pathname}?${paramsString}`;
    if (newUrl !== `${pathname}?${searchParams?.toString()}`) {
      setIsSearching(true);
      router.push(newUrl);
    } else {
      setIsSearching(true);
      revalidateInventory();
    }
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedStatuses([]);
    setSelectedEmployees([]);
    setAssignmentStatus('all');
    setSearch('');
    setPurchaseDateFrom(undefined);
    setPurchaseDateTo(undefined);
    setAssignmentDateFrom(undefined);
    setAssignmentDateTo(undefined);
    sessionStorage.removeItem('it-inventory-filters');
    if (searchParams?.toString()) {
      setIsSearching(true);
      router.push(pathname || '');
    }
  };

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    selectedStatuses.length > 0 ||
    selectedEmployees.length > 0 ||
    assignmentStatus !== 'all' ||
    search !== '' ||
    purchaseDateFrom ||
    purchaseDateTo ||
    assignmentDateFrom ||
    assignmentDateTo;

  const hasUrlParams = Boolean(searchParams?.toString());

  const hasPendingChanges = (() => {
    const arraysEqual = (a: string[], b: string[]) =>
      JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

    return (
      !arraysEqual(selectedCategories, searchParams.getAll('category')) ||
      !arraysEqual(selectedStatuses, searchParams.getAll('status')) ||
      !arraysEqual(selectedEmployees, searchParams.getAll('employee')) ||
      assignmentStatus !== (searchParams.get('assignmentStatus') || 'all') ||
      search !== (searchParams.get('search') || '') ||
      (purchaseDateFrom?.toISOString() || '') !==
        (searchParams.get('purchaseDateFrom') || '') ||
      (purchaseDateTo?.toISOString() || '') !==
        (searchParams.get('purchaseDateTo') || '') ||
      (assignmentDateFrom?.toISOString() || '') !==
        (searchParams.get('assignmentDateFrom') || '') ||
      (assignmentDateTo?.toISOString() || '') !==
        (searchParams.get('assignmentDateTo') || '')
    );
  })();

  const canSearch = hasActiveFilters || hasPendingChanges || hasUrlParams;

  return (
    <FilterCard>
      <FilterCardContent
        className='pt-4'
        onSubmit={(e) => {
          e.preventDefault();
          applyFilters();
        }}
      >
        <FilterGrid cols={3}>
          <FilterField label={dict.common.search}>
            <Input
              placeholder='Asset ID, Serial Number, Model, Notes...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='w-full'
            />
          </FilterField>
          <FilterField label={dict.filters.category}>
            <MultiSelect
              options={EQUIPMENT_CATEGORIES.map((cat) => ({
                value: cat,
                label: dict.categories[cat],
              }))}
              value={selectedCategories}
              onValueChange={setSelectedCategories}
              placeholder={dict.common.select}
              emptyText={dict.table.noResults}
              clearLabel={dict.common.clear}
              selectedLabel={dict.bulk.selected}
              className='w-full'
            />
          </FilterField>
          <FilterField label={dict.filters.status}>
            <MultiSelect
              options={EQUIPMENT_STATUSES.map((status) => ({
                value: status,
                label: dict.statuses[status],
              }))}
              value={selectedStatuses}
              onValueChange={setSelectedStatuses}
              placeholder={dict.common.select}
              emptyText={dict.table.noResults}
              clearLabel={dict.common.clear}
              selectedLabel={dict.bulk.selected}
              className='w-full'
            />
          </FilterField>
        </FilterGrid>

        <FilterGrid cols={3}>
          <FilterField label={dict.filters.assignment}>
            <Select value={assignmentStatus} onValueChange={setAssignmentStatus}>
              <SelectTrigger className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>
                  {dict.filters.assignmentOptions.all}
                </SelectItem>
                <SelectItem value='assigned'>
                  {dict.filters.assignmentOptions.assigned}
                </SelectItem>
                <SelectItem value='unassigned'>
                  {dict.filters.assignmentOptions.unassigned}
                </SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label={dict.filters.purchaseDateFrom}>
            <DateTimePicker
              value={purchaseDateFrom}
              onChange={setPurchaseDateFrom}
              hideTime
              renderTrigger={({ value, setOpen, open }) => (
                <DateTimeInput
                  value={value}
                  onChange={(x) => !open && setPurchaseDateFrom(x)}
                  format='dd/MM/yyyy'
                  disabled={open}
                  onCalendarClick={() => setOpen(!open)}
                  className='w-full'
                />
              )}
            />
          </FilterField>
          <FilterField label={dict.filters.purchaseDateTo}>
            <DateTimePicker
              value={purchaseDateTo}
              onChange={setPurchaseDateTo}
              hideTime
              renderTrigger={({ value, setOpen, open }) => (
                <DateTimeInput
                  value={value}
                  onChange={(x) => !open && setPurchaseDateTo(x)}
                  format='dd/MM/yyyy'
                  disabled={open}
                  onCalendarClick={() => setOpen(!open)}
                  className='w-full'
                />
              )}
            />
          </FilterField>
        </FilterGrid>

        <FilterGrid cols={3}>
          <FilterField label={dict.filters.employee}>
            <MultiSelect
              options={employees.map((emp) => ({
                value: emp.identifier,
                label: `${emp.firstName} ${emp.lastName} (${emp.identifier})`,
              }))}
              value={selectedEmployees}
              onValueChange={setSelectedEmployees}
              placeholder={dict.common.select}
              emptyText={dict.table.noResults}
              clearLabel={dict.common.clear}
              selectedLabel={dict.bulk.selected}
              className='w-full'
            />
          </FilterField>
          <FilterField label={dict.filters.assignmentDateFrom}>
            <DateTimePicker
              value={assignmentDateFrom}
              onChange={setAssignmentDateFrom}
              hideTime
              renderTrigger={({ value, setOpen, open }) => (
                <DateTimeInput
                  value={value}
                  onChange={(x) => !open && setAssignmentDateFrom(x)}
                  format='dd/MM/yyyy'
                  disabled={open}
                  onCalendarClick={() => setOpen(!open)}
                  className='w-full'
                />
              )}
            />
          </FilterField>
          <FilterField label={dict.filters.assignmentDateTo}>
            <DateTimePicker
              value={assignmentDateTo}
              onChange={setAssignmentDateTo}
              hideTime
              renderTrigger={({ value, setOpen, open }) => (
                <DateTimeInput
                  value={value}
                  onChange={(x) => !open && setAssignmentDateTo(x)}
                  format='dd/MM/yyyy'
                  disabled={open}
                  onCalendarClick={() => setOpen(!open)}
                  className='w-full'
                />
              )}
            />
          </FilterField>
        </FilterGrid>

        <FilterActions
          onClear={clearFilters}
          isPending={isSearching}
          disabled={!canSearch}
          clearLabel={dict.common.clear}
          searchLabel={dict.common.search}
        />
      </FilterCardContent>
    </FilterCard>
  );
}
