import { createGetDictionary } from '@/lib/dict-helpers';

const dictionaries = {
  pl: () => import('./dictionaries/pl.json').then((module) => module.default),
  de: () => import('./dictionaries/de.json').then((module) => module.default),
  en: () => import('./dictionaries/en.json').then((module) => module.default),
};

export const getDictionary = createGetDictionary(dictionaries);
export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;
