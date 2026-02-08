'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CircleX, Loader, Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { revalidateConfigs as revalidate } from '../actions/utils';
import { Dictionary } from '../lib/dict';
import { WORKPLACES } from '../lib/types';

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
  const [workplace, setWorkplace] = useState(
    () => searchParams?.get('workplace') || '',
  );

  const buildUrl = (newSearch: string, newWorkplace: string) => {
    const params = new URLSearchParams();
    if (newSearch.trim()) params.set('search', newSearch.trim());
    if (newWorkplace) params.set('workplace', newWorkplace);
    return params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname || '';
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newUrl = buildUrl(searchText, workplace);
    if (newUrl !== `${pathname}?${searchParams?.toString()}`) {
      setIsPendingSearch(true);
      router.push(newUrl);
    } else {
      setIsPendingSearch(true);
      revalidate();
    }
  };

  const handleWorkplaceChange = (value: string) => {
    const newWorkplace = value === 'all' ? '' : value;
    setWorkplace(newWorkplace);
    const newUrl = buildUrl(searchText, newWorkplace);
    setIsPendingSearch(true);
    router.push(newUrl);
  };

  const handleClear = () => {
    setSearchText('');
    setWorkplace('');
    if (searchParams?.toString()) {
      setIsPendingSearch(true);
      router.push(pathname || '');
    }
  };

  useEffect(() => {
    setIsPendingSearch(false);
  }, [fetchTime]);

  const hasActiveFilters = Boolean(searchText || workplace);
  const hasUrlParams = Boolean(searchParams?.toString());
  const canSearch = hasActiveFilters || hasUrlParams;

  return (
    <Card>
      <CardContent className='p-4'>
        <form onSubmit={handleSearch} className='flex flex-col gap-4'>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <div className='flex flex-col space-y-1'>
              <Label>{dict.filters.workplace}</Label>
              <Select
                value={workplace || 'all'}
                onValueChange={handleWorkplaceChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder={dict.filters.allWorkplaces} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>
                    {dict.filters.allWorkplaces}
                  </SelectItem>
                  {WORKPLACES.map((wp) => (
                    <SelectItem key={wp} value={wp}>
                      {wp.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='flex flex-col space-y-1'>
              <Label>{dict.filters.searchPlaceholder}</Label>
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
