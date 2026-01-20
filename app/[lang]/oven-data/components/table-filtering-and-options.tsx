'use client';

import { Button } from '@/components/ui/button';
import { DateTimeInput } from '@/components/ui/datetime-input';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { FilterCard, FilterCardContent } from '@/components/ui/filter-card';
import { FilterField } from '@/components/ui/filter-field';
import { FilterGrid } from '@/components/ui/filter-grid';
import { MultiSelect } from '@/components/ui/multi-select';
import { CircleX, FileSpreadsheet, Loader, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { revalidateOvenTableData as revalidate } from '../actions';
import type { Dictionary } from '../lib/dict';
import PasteValuesDialog from './paste-values-dialog';

export default function OvenTableFilteringAndOptions({
  ovens,
  fetchTime,
  dict,
}: {
  ovens: string[];
  fetchTime: Date;
  dict: Dictionary;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isPendingSearch, setIsPendingSearch] = useState(false);

  useEffect(() => {
    setIsPendingSearch(false);
  }, [fetchTime]);

  const getOneMonthAgo = () => {
    const today = new Date();
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(today.getMonth() - 1);
    oneMonthAgo.setHours(0, 0, 0, 0);
    return oneMonthAgo;
  };

  const getToday = () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return today;
  };

  const [statusFilter, setStatusFilter] = useState<string[]>(() => {
    const statusParam = searchParams?.get('status');
    return statusParam
      ? statusParam
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : [];
  });
  const [fromFilter, setFromFilter] = useState<Date>(() => {
    const fromParam = searchParams?.get('from');
    return fromParam ? new Date(fromParam) : getOneMonthAgo();
  });
  const [toFilter, setToFilter] = useState<Date>(() => {
    const toParam = searchParams?.get('to');
    return toParam ? new Date(toParam) : getToday();
  });
  const [hydraBatchFilter, setHydraBatchFilter] = useState(
    searchParams?.get('hydra_batch') || '',
  );
  const [articleFilter, setArticleFilter] = useState(
    searchParams?.get('article') || '',
  );
  const [ovenFilter, setOvenFilter] = useState<string[]>(() => {
    const ovenParam = searchParams?.get('oven');
    return ovenParam
      ? ovenParam
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : [];
  });

  const getValueCount = (value: string) => {
    if (!value.trim()) return 0;
    return value
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v.length > 0).length;
  };

  const handleClearFilters = () => {
    setStatusFilter([]);
    setFromFilter(getOneMonthAgo());
    setToFilter(getToday());
    setHydraBatchFilter('');
    setArticleFilter('');
    setOvenFilter([]);

    if (searchParams?.toString()) {
      setIsPendingSearch(true);
      router.push(pathname || '');
    }
  };

  const handleSearchClick = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (statusFilter.length > 0) params.set('status', statusFilter.join(','));
    if (fromFilter) params.set('from', fromFilter.toISOString());
    if (toFilter) params.set('to', toFilter.toISOString());
    if (hydraBatchFilter) params.set('hydra_batch', hydraBatchFilter);
    if (articleFilter) params.set('article', articleFilter);
    if (ovenFilter.length > 0) params.set('oven', ovenFilter.join(','));
    const newUrl = `${pathname}?${params.toString()}`;
    if (newUrl !== `${pathname}?${searchParams?.toString()}`) {
      setIsPendingSearch(true);
      router.push(newUrl);
    } else {
      setIsPendingSearch(true);
      revalidate();
    }
  };

  const statusOptions = [
    { value: 'prepared', label: dict.processStatus.prepared },
    { value: 'running', label: dict.processStatus.running },
    { value: 'finished', label: dict.processStatus.completed },
    { value: 'deleted', label: dict.processStatus.failed },
  ];

  const ovenOptions = ovens.map((oven) => ({
    value: oven,
    label: oven.toUpperCase(),
  }));

  return (
    <FilterCard>
      <FilterCardContent className='pt-4' onSubmit={handleSearchClick}>
        <FilterGrid cols={2}>
          <FilterField label={dict.timeFilters.from}>
            <DateTimePicker
              value={fromFilter}
              onChange={(date) => setFromFilter(date || getOneMonthAgo())}
              max={toFilter}
              renderTrigger={({ value, setOpen, open }) => (
                <DateTimeInput
                  value={value}
                  onChange={(x) => !open && setFromFilter(x || getOneMonthAgo())}
                  format='dd/MM/yyyy HH:mm'
                  disabled={open}
                  onCalendarClick={() => setOpen(!open)}
                  className='w-full'
                />
              )}
            />
          </FilterField>
          <FilterField label={dict.timeFilters.to}>
            <DateTimePicker
              value={toFilter}
              onChange={(date) => setToFilter(date || getToday())}
              max={new Date()}
              min={fromFilter}
              renderTrigger={({ value, setOpen, open }) => (
                <DateTimeInput
                  value={value}
                  onChange={(x) => !open && setToFilter(x || getToday())}
                  format='dd/MM/yyyy HH:mm'
                  disabled={open}
                  onCalendarClick={() => setOpen(!open)}
                  className='w-full'
                />
              )}
            />
          </FilterField>
        </FilterGrid>

        <FilterGrid cols={2}>
          <FilterField label={dict.processFilters.oven}>
            <MultiSelect
              options={ovenOptions}
              value={ovenFilter}
              onValueChange={setOvenFilter}
              placeholder={dict.processFilters.select}
              searchPlaceholder={dict.processFilters.searchPlaceholder}
              emptyText={dict.processFilters.notFound}
              className='w-full'
            />
          </FilterField>

          <FilterField label={dict.processFilters.status}>
            <MultiSelect
              options={statusOptions}
              value={statusFilter}
              onValueChange={setStatusFilter}
              placeholder={dict.processFilters.select}
              searchPlaceholder={dict.processFilters.searchPlaceholder}
              emptyText={dict.processFilters.notFound}
              className='w-full'
            />
          </FilterField>
        </FilterGrid>

        <FilterGrid cols={2}>
          <FilterField label={dict.processFilters.hydraBatch}>
            <PasteValuesDialog
              fieldType='hydra_batch'
              fieldLabel={dict.processFilters.hydraBatch}
              currentValue={hydraBatchFilter}
              currentCount={getValueCount(hydraBatchFilter)}
              onApplyValues={setHydraBatchFilter}
              dict={dict}
            >
              <Button
                variant='outline'
                className='w-full justify-start'
                title={dict.processFilters.clickToPaste}
              >
                {hydraBatchFilter ? (
                  <span className='text-left'>
                    {dict.processFilters.hydraBatch} (
                    {getValueCount(hydraBatchFilter)} value
                    {getValueCount(hydraBatchFilter) !== 1 ? 's' : ''})
                  </span>
                ) : (
                  <span className='text-muted-foreground'>
                    {dict.processFilters.clickToAdd}
                  </span>
                )}
              </Button>
            </PasteValuesDialog>
          </FilterField>

          <FilterField label={dict.processFilters.article}>
            <PasteValuesDialog
              fieldType='article'
              fieldLabel={dict.processFilters.article}
              currentValue={articleFilter}
              currentCount={getValueCount(articleFilter)}
              onApplyValues={setArticleFilter}
              dict={dict}
            >
              <Button
                variant='outline'
                className='w-full justify-start'
                title={dict.processFilters.clickToPaste}
              >
                {articleFilter ? (
                  <span className='text-left'>
                    {dict.processFilters.article} ({getValueCount(articleFilter)}{' '}
                    value
                    {getValueCount(articleFilter) !== 1 ? 's' : ''})
                  </span>
                ) : (
                  <span className='text-muted-foreground'>
                    {dict.processFilters.clickToAdd}
                  </span>
                )}
              </Button>
            </PasteValuesDialog>
          </FilterField>
        </FilterGrid>

        <div className='flex flex-col gap-2 sm:flex-row sm:justify-between'>
          <Button
            type='button'
            variant='destructive'
            onClick={handleClearFilters}
            title={dict.processFilters.clear}
            disabled={isPendingSearch}
            className='order-2 w-full sm:order-1 sm:w-auto'
          >
            <CircleX /> <span>{dict.processFilters.clear}</span>
          </Button>

          <div className='order-1 flex flex-col gap-2 sm:order-2 sm:flex-row'>
            <Link
              href={`/api/oven-data/excel?${new URLSearchParams(
                Object.entries({
                  status: Array.isArray(statusFilter)
                    ? statusFilter.join(',')
                    : statusFilter,
                  from: fromFilter?.toISOString(),
                  to: toFilter?.toISOString(),
                  hydra_batch: hydraBatchFilter,
                  article: articleFilter,
                  oven: Array.isArray(ovenFilter)
                    ? ovenFilter.join(',')
                    : ovenFilter,
                }).reduce(
                  (acc, [key, value]) => {
                    if (value) acc[key] = value;
                    return acc;
                  },
                  {} as Record<string, string>,
                ),
              ).toString()}`}
            >
              <Button className='w-full sm:w-auto'>
                <FileSpreadsheet />
                <span>{dict.processFilters.export}</span>
              </Button>
            </Link>

            <Button
              type='submit'
              variant='secondary'
              disabled={isPendingSearch}
              className='w-full sm:w-auto'
            >
              {isPendingSearch ? (
                <Loader className='animate-spin' />
              ) : (
                <Search />
              )}
              <span>{dict.processFilters.search}</span>
            </Button>
          </div>
        </div>
      </FilterCardContent>
    </FilterCard>
  );
}
