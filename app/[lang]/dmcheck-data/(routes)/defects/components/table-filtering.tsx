'use client';

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
import type { Dictionary } from '../lib/dict';
import type {
  ArticleConfigType,
  DefectType,
} from '../../../lib/types';
import { getOneWeekAgo, getToday } from '../../../lib/utils';

export default function DefectsTableFiltering({
  articles,
  defects,
  fetchTime,
  dict,
  lang,
}: {
  articles: ArticleConfigType[];
  defects: DefectType[];
  fetchTime: Date;
  dict: Dictionary;
  lang: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isPendingSearch, setIsPendingSearch] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setIsPendingSearch(false);
  }, [fetchTime]);

  const [fromFilter, setFromFilter] = useState<Date | null>(() => {
    const fromParam = searchParams?.get('from');
    return fromParam ? new Date(fromParam) : getOneWeekAgo();
  });
  const [toFilter, setToFilter] = useState<Date | null>(() => {
    const toParam = searchParams?.get('to');
    return toParam ? new Date(toParam) : getToday();
  });
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
  const [defectKeyFilter, setDefectKeyFilter] = useState<string[]>(() => {
    const defectKeyParam = searchParams?.get('defectKey');
    return defectKeyParam
      ? defectKeyParam
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : [];
  });

  const hasActiveFilters =
    fromFilter ||
    toFilter ||
    workplaceFilter.length > 0 ||
    articleFilter.length > 0 ||
    defectKeyFilter.length > 0;

  const hasUrlParams = Boolean(searchParams?.toString());

  const hasPendingChanges = (() => {
    const arraysEqual = (a: string[], b: string[]) =>
      JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

    const urlWorkplace = searchParams?.get('workplace')?.split(',').filter(Boolean) || [];
    const urlArticle = searchParams?.get('article')?.split(',').filter(Boolean) || [];
    const urlDefectKey = searchParams?.get('defectKey')?.split(',').filter(Boolean) || [];
    const urlFrom = searchParams?.get('from') || '';
    const urlTo = searchParams?.get('to') || '';

    return (
      !arraysEqual(workplaceFilter, urlWorkplace) ||
      !arraysEqual(articleFilter, urlArticle) ||
      !arraysEqual(defectKeyFilter, urlDefectKey) ||
      (fromFilter?.toISOString() || '') !== urlFrom ||
      (toFilter?.toISOString() || '') !== urlTo
    );
  })();

  const canSearch = hasActiveFilters || hasPendingChanges || hasUrlParams;

  const handleSearchClick = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const params = new URLSearchParams();
      if (fromFilter) params.set('from', fromFilter.toISOString());
      if (toFilter) params.set('to', toFilter.toISOString());
      if (workplaceFilter.length > 0)
        params.set('workplace', workplaceFilter.join(','));
      if (articleFilter.length > 0)
        params.set('article', articleFilter.join(','));
      if (defectKeyFilter.length > 0)
        params.set('defectKey', defectKeyFilter.join(','));
      const newUrl = `${pathname}?${params.toString()}`;
      setIsPendingSearch(true);
      router.push(newUrl);
    },
    [
      fromFilter,
      toFilter,
      workplaceFilter,
      articleFilter,
      defectKeyFilter,
      pathname,
      router,
    ],
  );

  const handleClearFilters = useCallback(() => {
    setFromFilter(null);
    setToFilter(null);
    setWorkplaceFilter([]);
    setArticleFilter([]);
    setDefectKeyFilter([]);

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
          from: fromFilter?.toISOString(),
          to: toFilter?.toISOString(),
          workplace:
            workplaceFilter.length > 0 ? workplaceFilter.join(',') : undefined,
          article:
            articleFilter.length > 0 ? articleFilter.join(',') : undefined,
          defectKey:
            defectKeyFilter.length > 0 ? defectKeyFilter.join(',') : undefined,
        }).reduce(
          (acc, [key, value]) => {
            if (value) acc[key] = value;
            return acc;
          },
          {} as Record<string, string>,
        ),
      );

      const response = await fetch(
        `/api/dmcheck-data/defects-excel?${params.toString()}`,
      );
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'DMCheck-defects.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [fromFilter, toFilter, workplaceFilter, articleFilter, defectKeyFilter]);

  const defectReportingArticles = useMemo(
    () => articles.filter((article) => article.enableDefectReporting === true),
    [articles],
  );

  const workplaceOptions = useMemo(
    () =>
      Array.from(
        new Set(defectReportingArticles.map((article) => article.workplace)),
      ).map((workplace) => ({
        value: workplace,
        label: workplace.toUpperCase(),
      })),
    [defectReportingArticles],
  );

  const articleOptions = useMemo(
    () =>
      defectReportingArticles
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
    [defectReportingArticles, workplaceFilter],
  );

  const defectOptions = useMemo(
    () =>
      defects
        .sort((a, b) => a.order - b.order)
        .map((defect) => ({
          value: defect.key,
          label: defect.translations[lang] || defect.key,
        })),
    [defects, lang],
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

          <FilterField label={dict.filters.defectKey}>
            <MultiSelect
              options={defectOptions}
              value={defectKeyFilter}
              onValueChange={setDefectKeyFilter}
              placeholder={dict.filters.select}
              searchPlaceholder={dict.filters.search}
              emptyText={dict.filters.notFound}
              clearLabel={dict.filters.clearFilter}
              selectedLabel={dict.filters.selected}
              className='w-full'
            />
          </FilterField>
        </FilterGrid>

        <div className='flex flex-col gap-2 sm:flex-row sm:justify-between'>
          <Button
            type='button'
            variant='destructive'
            onClick={handleClearFilters}
            title={dict.filters.clearFilters}
            disabled={isPendingSearch || !canSearch}
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
              disabled={isPendingSearch || !canSearch}
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
