'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FilterGrid } from '@/components/ui/filter-grid';
import { FilterField } from '@/components/ui/filter-field';
import { FilterActions } from '@/components/ui/filter-actions';
import { MultiSelect } from '@/components/ui/multi-select';
import type { MultiSelectOption } from '@/components/ui/multi-select';
import { Input } from '@/components/ui/input';
import type { Dictionary } from '../../../lib/dict';

interface CertTableFilteringProps {
  dict: Dictionary;
  certTypeOptions: MultiSelectOption[];
  fetchTime: Date;
}

export function CertTableFiltering({
  dict,
  certTypeOptions,
  fetchTime,
}: CertTableFilteringProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setIsPending(false);
  }, [fetchTime]);

  // Initialize state from URL
  const [statusFilter, setStatusFilter] = useState<string[]>(() => {
    const param = searchParams?.get('status');
    return param
      ? param
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  });

  const [typeFilter, setTypeFilter] = useState<string[]>(() => {
    const param = searchParams?.get('type');
    return param
      ? param
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  });

  const [employeeFilter, setEmployeeFilter] = useState(
    searchParams?.get('employee') || '',
  );

  const statusOptions: MultiSelectOption[] = [
    { value: 'valid', label: dict.certifications.valid },
    { value: 'expiring', label: dict.certifications.expiringSoon },
    { value: 'expired', label: dict.certifications.expired },
    { value: 'no-expiration', label: dict.certifications.noExpiration },
  ];

  const hasActiveFilters =
    statusFilter.length > 0 ||
    typeFilter.length > 0 ||
    employeeFilter.length > 0;

  const hasUrlParams = Boolean(searchParams?.toString());

  const hasPendingChanges = (() => {
    const arraysEqual = (a: string[], b: string[]) =>
      JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

    const urlStatus =
      searchParams?.get('status')?.split(',').filter(Boolean) || [];
    const urlType =
      searchParams?.get('type')?.split(',').filter(Boolean) || [];
    const urlEmployee = searchParams?.get('employee') || '';

    return (
      !arraysEqual(statusFilter, urlStatus) ||
      !arraysEqual(typeFilter, urlType) ||
      employeeFilter !== urlEmployee
    );
  })();

  const canSearch = hasActiveFilters || hasPendingChanges || hasUrlParams;

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const params = new URLSearchParams();
      if (statusFilter.length > 0)
        params.set('status', statusFilter.join(','));
      if (typeFilter.length > 0) params.set('type', typeFilter.join(','));
      if (employeeFilter) params.set('employee', employeeFilter);

      const newUrl = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname || '';

      if (newUrl !== `${pathname}?${searchParams?.toString()}`) {
        setIsPending(true);
        router.push(newUrl);
      }
    },
    [statusFilter, typeFilter, employeeFilter, pathname, searchParams, router],
  );

  const handleClear = useCallback(() => {
    setStatusFilter([]);
    setTypeFilter([]);
    setEmployeeFilter('');

    if (searchParams?.toString()) {
      setIsPending(true);
      router.push(pathname || '');
    }
  }, [searchParams, pathname, router]);

  return (
    <form onSubmit={handleSearch} className="flex flex-col gap-4">
      <FilterGrid cols={3}>
        <FilterField label={dict.certifications.filters.status}>
          <MultiSelect
            options={statusOptions}
            value={statusFilter}
            onValueChange={setStatusFilter}
            placeholder={dict.all}
            searchPlaceholder={dict.search}
            emptyText={dict.noData}
            className="w-full"
          />
        </FilterField>
        <FilterField label={dict.certifications.filters.certType}>
          <MultiSelect
            options={certTypeOptions}
            value={typeFilter}
            onValueChange={setTypeFilter}
            placeholder={dict.all}
            searchPlaceholder={dict.search}
            emptyText={dict.noData}
            className="w-full"
          />
        </FilterField>
        <FilterField label={dict.certifications.filters.employee}>
          <Input
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
          />
        </FilterField>
      </FilterGrid>
      <FilterActions
        onClear={handleClear}
        isPending={isPending}
        disabled={!canSearch}
        clearLabel={dict.cancel}
        searchLabel={dict.search}
      />
    </form>
  );
}
