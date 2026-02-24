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

interface PositionTableFilteringProps {
  dict: Dictionary;
  departmentOptions: MultiSelectOption[];
  fetchTime: Date;
}

export function PositionTableFiltering({
  dict,
  departmentOptions,
  fetchTime,
}: PositionTableFilteringProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setIsPending(false);
  }, [fetchTime]);

  const [nameFilter, setNameFilter] = useState(
    searchParams?.get('name') || '',
  );

  const [departmentFilter, setDepartmentFilter] = useState<string[]>(() => {
    const param = searchParams?.get('department');
    return param
      ? param
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  });

  const hasActiveFilters =
    nameFilter.length > 0 || departmentFilter.length > 0;

  const hasUrlParams = Boolean(searchParams?.toString());

  const hasPendingChanges = (() => {
    const arraysEqual = (a: string[], b: string[]) =>
      JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

    const urlName = searchParams?.get('name') || '';
    const urlDept =
      searchParams?.get('department')?.split(',').filter(Boolean) || [];

    return (
      nameFilter !== urlName || !arraysEqual(departmentFilter, urlDept)
    );
  })();

  const canSearch = hasActiveFilters || hasPendingChanges || hasUrlParams;

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const params = new URLSearchParams();
      if (nameFilter) params.set('name', nameFilter);
      if (departmentFilter.length > 0)
        params.set('department', departmentFilter.join(','));

      const newUrl = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname || '';

      if (newUrl !== `${pathname}?${searchParams?.toString()}`) {
        setIsPending(true);
        router.push(newUrl);
      }
    },
    [nameFilter, departmentFilter, pathname, searchParams, router],
  );

  const handleClear = useCallback(() => {
    setNameFilter('');
    setDepartmentFilter([]);

    if (searchParams?.toString()) {
      setIsPending(true);
      router.push(pathname || '');
    }
  }, [searchParams, pathname, router]);

  return (
    <form onSubmit={handleSearch} className="flex flex-col gap-4">
      <FilterGrid cols={2}>
        <FilterField label={dict.positions.filters.name}>
          <Input
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            placeholder={dict.search}
          />
        </FilterField>
        <FilterField label={dict.positions.filters.department}>
          <MultiSelect
            options={departmentOptions}
            value={departmentFilter}
            onValueChange={setDepartmentFilter}
            placeholder={dict.all}
            searchPlaceholder={dict.search}
            emptyText={dict.noData}
            className="w-full"
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
