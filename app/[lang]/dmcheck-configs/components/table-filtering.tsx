'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import { CircleX, Loader, Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { revalidateConfigs as revalidate } from '../actions/utils';
import { Dictionary } from '../lib/dict';
import { WORKPLACES } from '../lib/types';

const workplaceOptions = WORKPLACES.map((wp) => ({
  value: wp,
  label: wp.toUpperCase(),
}));

export default function TableFiltering({
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

  const [workplaceFilter, setWorkplaceFilter] = useState<string[]>(() => {
    const wp = searchParams?.get('workplace');
    return wp ? wp.split(',') : [];
  });

  const [searchText, setSearchText] = useState(
    () => searchParams?.get('search') || '',
  );

  const handleClearFilters = () => {
    setWorkplaceFilter([]);
    setSearchText('');
    if (searchParams?.toString()) {
      setIsPendingSearch(true);
      router.push(pathname || '');
    }
  };

  const handleSearchClick = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (workplaceFilter.length > 0)
      params.set('workplace', workplaceFilter.join(','));
    if (searchText.trim()) params.set('search', searchText.trim());
    const newUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname || '';
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

  const hasActiveFilters = Boolean(workplaceFilter.length > 0 || searchText);
  const hasUrlParams = Boolean(searchParams?.toString());

  const hasPendingChanges = (() => {
    const urlWorkplace = searchParams?.get('workplace')?.split(',') || [];
    const urlSearch = searchParams?.get('search') || '';

    const arraysEqual = (a: string[], b: string[]) =>
      JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

    return (
      !arraysEqual(workplaceFilter, urlWorkplace) ||
      searchText !== urlSearch
    );
  })();

  const canSearch = hasActiveFilters || hasPendingChanges || hasUrlParams;

  return (
    <Card>
      <CardContent className='p-4'>
        <form onSubmit={handleSearchClick} className='flex flex-col gap-4'>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <div className='flex flex-col space-y-1'>
              <Label>{dict.filters.workplace}</Label>
              <MultiSelect
                value={workplaceFilter}
                onValueChange={setWorkplaceFilter}
                placeholder={dict.filters.select}
                searchPlaceholder={dict.filters.searchPlaceholder}
                emptyText={dict.filters.notFound}
                clearLabel={dict.filters.clearFilter}
                selectedLabel={dict.filters.selected}
                className='w-full'
                options={workplaceOptions}
              />
            </div>
            <div className='flex flex-col space-y-1'>
              <Label>{dict.filters.searchLabel}</Label>
              <Input
                value={searchText}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchText(e.target.value)
                }
                className='w-full'
              />
            </div>
          </div>

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
