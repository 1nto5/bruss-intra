import 'server-only';
import type { Locale } from '@/lib/config/i18n';

const dictionaries: Record<
  string,
  () => Promise<{ default: Dictionary }>
> = {
  en: () => import('./dictionaries/en.json'),
  de: () => import('./dictionaries/de.json'),
  pl: () => import('./dictionaries/pl.json'),
};

export type Dictionary = {
  title: string;
  lastSync: string;
  columns: {
    dmc: string;
    time: string;
    article: string;
    workplace: string;
    operator: string;
    defects: string;
  };
  filters: {
    from: string;
    to: string;
    workplace: string;
    article: string;
    defectKey: string;
    defectCategory: string;
    defectGroup: string;
    select: string;
    search: string;
    notFound: string;
    clear: string;
    clearFilters: string;
    clearFilter: string;
    selected: string;
    export: string;
    search_button: string;
    refresh: string;
  };
  table: {
    noResults: string;
  };
};

export const getDictionary = async (locale: Locale): Promise<Dictionary> =>
  (await dictionaries[locale]()).default;
