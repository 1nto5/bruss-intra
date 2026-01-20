'use client';

import { ArticleConfigType } from '@/app/[lang]/dmcheck-data/lib/dmcheck-data-types';
import { Button } from '@/components/ui/button';
import { DateTimeInput } from '@/components/ui/datetime-input';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { FilterCard, FilterCardContent } from '@/components/ui/filter-card';
import { FilterField } from '@/components/ui/filter-field';
import { FilterGrid } from '@/components/ui/filter-grid';
import { MultiSelect } from '@/components/ui/multi-select';
import { CircleX, FileSpreadsheet, Loader, Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { revalidateDmcheckTableData as revalidate } from '../actions';
import type { Dictionary } from '../lib/dict';
import { getOneWeekAgo, getToday, getValueCount } from '../lib/utils';
import PasteValuesDialog from './paste-values-dialog';

export default function DmcTableFilteringAndOptions({
  articles,
  fetchTime,
  dict,
}: {
  articles: ArticleConfigType[];
  fetchTime: Date;
  dict: Dictionary;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isPendingSearch, setIsPendingSearch] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setIsPendingSearch(false);
  }, [fetchTime]);

  const [statusFilter, setStatusFilter] = useState<string[]>(() => {
    const statusParam = searchParams?.get('status');
    return statusParam
      ? statusParam
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : [];
  });
  const [fromFilter, setFromFilter] = useState<Date | null>(() => {
    const fromParam = searchParams?.get('from');
    return fromParam ? new Date(fromParam) : getOneWeekAgo();
  });
  const [toFilter, setToFilter] = useState<Date | null>(() => {
    const toParam = searchParams?.get('to');
    return toParam ? new Date(toParam) : getToday();
  });
  const [dmcFilter, setDmcFilter] = useState(searchParams?.get('dmc') || '');
  const [hydraFilter, setHydraFilter] = useState(
    searchParams?.get('hydra_batch') || '',
  );
  const [palletFilter, setPalletFilter] = useState(
    searchParams?.get('pallet_batch') || '',
  );
  const [workplaceFilter, setWorkplaceFilter] = useState<string[]>(() => {
    const workplaceParam = searchParams?.get('workplace');
    return workplaceParam
      ? workplaceParam
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : [];
  });
  const [articleFilter, setArticleFilter] = useState<string[]>(() => {
    const articleParam = searchParams?.get('article');
    return articleParam
      ? articleParam
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : [];
  });

  const hasFilters =
    statusFilter.length > 0 ||
    fromFilter ||
    toFilter ||
    dmcFilter ||
    hydraFilter ||
    palletFilter ||
    workplaceFilter.length > 0 ||
    articleFilter.length > 0;

  const handleSearchClick = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const params = new URLSearchParams();
      if (statusFilter.length > 0) params.set('status', statusFilter.join(','));
      if (fromFilter) params.set('from', fromFilter.toISOString());
      if (toFilter) params.set('to', toFilter.toISOString());
      if (dmcFilter) params.set('dmc', dmcFilter);
      if (hydraFilter) params.set('hydra_batch', hydraFilter);
      if (palletFilter) params.set('pallet_batch', palletFilter);
      if (workplaceFilter.length > 0)
        params.set('workplace', workplaceFilter.join(','));
      if (articleFilter.length > 0)
        params.set('article', articleFilter.join(','));
      const newUrl = `${pathname}?${params.toString()}`;
      if (newUrl !== `${pathname}?${searchParams?.toString()}`) {
        setIsPendingSearch(true);
        router.push(newUrl);
      } else {
        setIsPendingSearch(true);
        revalidate();
      }
    },
    [
      statusFilter,
      fromFilter,
      toFilter,
      dmcFilter,
      hydraFilter,
      palletFilter,
      workplaceFilter,
      articleFilter,
      pathname,
      searchParams,
      router,
    ],
  );

  const handleClearFilters = useCallback(() => {
    setStatusFilter([]);
    setFromFilter(null);
    setToFilter(null);
    setDmcFilter('');
    setHydraFilter('');
    setPalletFilter('');
    setWorkplaceFilter([]);
    setArticleFilter([]);

    if (searchParams?.toString()) {
      setIsPendingSearch(true);
      router.push(pathname || '');
    }
  }, [searchParams, pathname, router]);

  const handleExportClick = useCallback(async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams(
        Object.entries({
          status: Array.isArray(statusFilter)
            ? statusFilter.join(',')
            : statusFilter,
          from: fromFilter?.toISOString(),
          to: toFilter?.toISOString(),
          dmc: dmcFilter,
          hydra_batch: hydraFilter,
          pallet_batch: palletFilter,
          workplace: Array.isArray(workplaceFilter)
            ? workplaceFilter.join(',')
            : workplaceFilter,
          article: Array.isArray(articleFilter)
            ? articleFilter.join(',')
            : articleFilter,
        }).reduce(
          (acc, [key, value]) => {
            if (value) acc[key] = value;
            return acc;
          },
          {} as Record<string, string>,
        ),
      );

      const response = await fetch(
        `/api/dmcheck-data/excel?${params.toString()}`,
      );
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'DMCheck-data.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [
    statusFilter,
    fromFilter,
    toFilter,
    dmcFilter,
    hydraFilter,
    palletFilter,
    workplaceFilter,
    articleFilter,
  ]);

  const statusOptions = [
    { value: 'box', label: dict.statusOptions.box },
    { value: 'pallet', label: dict.statusOptions.pallet },
    { value: 'warehouse', label: dict.statusOptions.warehouse },
    { value: 'rework', label: dict.statusOptions.rework },
    { value: 'defect', label: dict.statusOptions.defect },
  ];

  const workplaceOptions = useMemo(
    () =>
      Array.from(new Set(articles.map((article) => article.workplace))).map(
        (workplace) => ({
          value: workplace,
          label: workplace.toUpperCase(),
        }),
      ),
    [articles],
  );

  const articleOptions = useMemo(
    () =>
      articles
        .filter(
          (article) =>
            workplaceFilter.length === 0 ||
            workplaceFilter.includes(article.workplace),
        )
        .reduce((acc: { value: string; label: string }[], current) => {
          const x = acc.find((item) => item.value === current.articleNumber);
          if (!x) {
            return acc.concat([
              {
                value: current.articleNumber,
                label: `${current.articleNumber} - ${current.articleName}`,
              },
            ]);
          } else {
            return acc;
          }
        }, [])
        .sort((a, b) => a.value.localeCompare(b.value)),
    [articles, workplaceFilter],
  );

  return (
    <FilterCard>
      <FilterCardContent className='pt-4' onSubmit={handleSearchClick}>
        <FilterGrid cols={2}>
          <FilterField label={dict.filters.from}>
            <DateTimePicker
              value={fromFilter || undefined}
              onChange={(date) => setFromFilter(date || null)}
              max={toFilter || undefined}
              renderTrigger={({ value, setOpen, open }) => (
                <DateTimeInput
                  value={value}
                  onChange={(x) => !open && setFromFilter(x || null)}
                  format='dd/MM/yyyy HH:mm'
                  disabled={open}
                  onCalendarClick={() => setOpen(!open)}
                  className='w-full'
                />
              )}
            />
          </FilterField>
          <FilterField label={dict.filters.to}>
            <DateTimePicker
              value={toFilter || undefined}
              onChange={(date) => setToFilter(date || null)}
              max={new Date()}
              min={fromFilter || undefined}
              renderTrigger={({ value, setOpen, open }) => (
                <DateTimeInput
                  value={value}
                  onChange={(x) => !open && setToFilter(x || null)}
                  format='dd/MM/yyyy HH:mm'
                  disabled={open}
                  onCalendarClick={() => setOpen(!open)}
                  className='w-full'
                />
              )}
            />
          </FilterField>
        </FilterGrid>

        <FilterGrid cols={3}>
          <FilterField label={dict.filters.workplace}>
            <MultiSelect
              options={workplaceOptions}
              value={workplaceFilter}
              onValueChange={setWorkplaceFilter}
              placeholder={dict.filters.select}
              searchPlaceholder={dict.filters.search}
              emptyText={dict.filters.notFound}
              clearLabel={dict.filters.clearFilter}
              selectedLabel={dict.filters.selected}
              className='w-full'
            />
          </FilterField>

          <FilterField label={dict.filters.article}>
            <MultiSelect
              options={articleOptions}
              value={articleFilter}
              onValueChange={setArticleFilter}
              placeholder={dict.filters.select}
              searchPlaceholder={dict.filters.search}
              emptyText={dict.filters.notFound}
              clearLabel={dict.filters.clearFilter}
              selectedLabel={dict.filters.selected}
              className='w-full'
            />
          </FilterField>

          <FilterField label={dict.filters.status}>
            <MultiSelect
              options={statusOptions}
              value={statusFilter}
              onValueChange={setStatusFilter}
              placeholder={dict.filters.select}
              searchPlaceholder={dict.filters.search}
              emptyText={dict.filters.notFound}
              clearLabel={dict.filters.clearFilter}
              selectedLabel={dict.filters.selected}
              className='w-full'
            />
          </FilterField>
        </FilterGrid>

        <FilterGrid cols={3}>
          <FilterField label={dict.filters.dmc}>
            <PasteValuesDialog
              fieldType='dmc'
              fieldLabel={dict.filters.dmc}
              currentValue={dmcFilter}
              currentCount={getValueCount(dmcFilter)}
              onApplyValues={setDmcFilter}
              dict={dict}
            >
              <Button
                variant='outline'
                className='w-full justify-start'
                title={dict.filters.pasteTitle}
              >
                {dmcFilter ? (
                  <span className='text-left'>
                    {dict.filters.dmc} ({getValueCount(dmcFilter)}{' '}
                    {getValueCount(dmcFilter) !== 1
                      ? dict.filters.values
                      : dict.filters.value}
                    )
                  </span>
                ) : (
                  <span className='text-muted-foreground'>
                    {dict.filters.clickToAdd}
                  </span>
                )}
              </Button>
            </PasteValuesDialog>
          </FilterField>

          <FilterField label={dict.filters.hydraBatch}>
            <PasteValuesDialog
              fieldType='hydra_batch'
              fieldLabel={dict.filters.hydraBatch}
              currentValue={hydraFilter}
              currentCount={getValueCount(hydraFilter)}
              onApplyValues={setHydraFilter}
              dict={dict}
            >
              <Button
                variant='outline'
                className='w-full justify-start'
                title={dict.filters.pasteTitle}
              >
                {hydraFilter ? (
                  <span className='text-left'>
                    {dict.filters.hydraBatch} ({getValueCount(hydraFilter)}{' '}
                    {getValueCount(hydraFilter) !== 1
                      ? dict.filters.values
                      : dict.filters.value}
                    )
                  </span>
                ) : (
                  <span className='text-muted-foreground'>
                    {dict.filters.clickToAdd}
                  </span>
                )}
              </Button>
            </PasteValuesDialog>
          </FilterField>

          <FilterField label={dict.filters.palletBatch}>
            <PasteValuesDialog
              fieldType='pallet_batch'
              fieldLabel={dict.filters.palletBatch}
              currentValue={palletFilter}
              currentCount={getValueCount(palletFilter)}
              onApplyValues={setPalletFilter}
              dict={dict}
            >
              <Button
                variant='outline'
                className='w-full justify-start'
                title={dict.filters.pasteTitle}
              >
                {palletFilter ? (
                  <span className='text-left'>
                    {dict.filters.palletBatch} ({getValueCount(palletFilter)}{' '}
                    {getValueCount(palletFilter) !== 1
                      ? dict.filters.values
                      : dict.filters.value}
                    )
                  </span>
                ) : (
                  <span className='text-muted-foreground'>
                    {dict.filters.clickToAdd}
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
            title={dict.filters.clearFilters}
            disabled={isPendingSearch}
            className='order-2 w-full sm:order-1 sm:w-auto'
          >
            <CircleX /> <span>{dict.filters.clear}</span>
          </Button>

          <div className='order-1 flex flex-col gap-2 sm:order-2 sm:flex-row'>
            <Button
              type='button'
              onClick={handleExportClick}
              disabled={isExporting || isPendingSearch}
              className='w-full sm:w-auto'
            >
              {isExporting ? (
                <Loader className='animate-spin' />
              ) : (
                <FileSpreadsheet />
              )}
              <span>{dict.filters.export}</span>
            </Button>

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
              <span>{dict.filters.search_button}</span>
            </Button>
          </div>
        </div>
      </FilterCardContent>
    </FilterCard>
  );
}
