'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FilterGrid } from '@/components/ui/filter-grid';
import { FilterField } from '@/components/ui/filter-field';
import { FilterActions } from '@/components/ui/filter-actions';
import { MultiSelect } from '@/components/ui/multi-select';
import type { MultiSelectOption } from '@/components/ui/multi-select';
import { Input } from '@/components/ui/input';
import type { Dictionary } from '../../../../lib/dict';

interface CertTypeFilteringProps {
  dict: Dictionary;
  fetchTime: Date;
}

export function CertTypeFiltering({
  dict,
  fetchTime,
}: CertTypeFilteringProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setIsPending(false);
  }, [fetchTime]);

  const [statusFilter, setStatusFilter] = useState<string[]>(() => {
    const param = searchParams?.get('status');
    return param ? param.split(',').map((s) => s.trim()).filter(Boolean) : [];
  });

  const [nameFilter, setNameFilter] = useState(
    searchParams?.get('name') || '',
  );

  const statusOptions: MultiSelectOption[] = [
    { value: 'active', label: dict.active },
    { value: 'inactive', label: dict.inactive },
  ];

  const hasActiveFilters = statusFilter.length > 0 || nameFilter.length > 0;
  const hasUrlParams = Boolean(searchParams?.toString());

  const hasPendingChanges = (() => {
    const arraysEqual = (a: string[], b: string[]) =>
      JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
    const urlStatus =
      searchParams?.get('status')?.split(',').filter(Boolean) || [];
    const urlName = searchParams?.get('name') || '';
    return (
      !arraysEqual(statusFilter, urlStatus) || nameFilter !== urlName
    );
  })();

  const canSearch = hasActiveFilters || hasPendingChanges || hasUrlParams;

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const params = new URLSearchParams();
      if (statusFilter.length > 0) params.set('status', statusFilter.join(','));
      if (nameFilter) params.set('name', nameFilter);

      const newUrl = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname || '';

      if (newUrl !== `${pathname}?${searchParams?.toString()}`) {
        setIsPending(true);
        router.push(newUrl);
      }
    },
    [statusFilter, nameFilter, pathname, searchParams, router],
  );

  const handleClear = useCallback(() => {
    setStatusFilter([]);
    setNameFilter('');

    if (searchParams?.toString()) {
      setIsPending(true);
      router.push(pathname || '');
    }
  }, [searchParams, pathname, router]);

  return (
    <form onSubmit={handleSearch} className="flex flex-col gap-4">
      <FilterGrid cols={2}>
        <FilterField label={dict.settings.filters.status}>
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
        <FilterField label={dict.settings.filters.name}>
          <Input
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            placeholder={dict.search}
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
