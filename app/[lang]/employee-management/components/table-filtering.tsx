'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CircleX, Loader, Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { revalidateEmployees as revalidate } from '../actions/utils';
import { Dictionary } from '../lib/dict';

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
  const [searchText, setSearchText] = useState(
    () => searchParams?.get('search') || '',
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
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

  const handleClear = () => {
    setSearchText('');
    if (searchParams?.toString()) {
      setIsPendingSearch(true);
      router.push(pathname || '');
    }
  };

  useEffect(() => {
    setIsPendingSearch(false);
  }, [fetchTime]);

  const hasActiveFilters = Boolean(searchText);
  const hasUrlParams = Boolean(searchParams?.toString());

  const hasPendingChanges = (() => {
    const urlSearch = searchParams?.get('search') || '';
    return searchText !== urlSearch;
  })();

  const canSearch = hasActiveFilters || hasPendingChanges || hasUrlParams;

  return (
    <Card>
      <CardContent className='p-4'>
        <form onSubmit={handleSearch} className='flex flex-col gap-4'>
          <div className='grid grid-cols-1 gap-4'>
            <div className='flex flex-col space-y-1'>
              <Label>{dict.filters.searchLabel}</Label>
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={dict.filters.searchPlaceholder}
              />
            </div>
          </div>

          <div className='flex flex-col gap-2 sm:flex-row sm:justify-between'>
            <Button
              type='button'
              variant='destructive'
              onClick={handleClear}
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
