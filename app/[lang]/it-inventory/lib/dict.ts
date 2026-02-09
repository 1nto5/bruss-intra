const dictionaries = {
  en: () => import('./dictionaries/en.json').then((module) => module.default),
};

// Always return English regardless of locale param
export const getDictionary = async (_locale?: string) => dictionaries.en();
export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;
