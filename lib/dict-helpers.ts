import type { Locale } from "@/lib/config/i18n";

export type DictionaryModule<T = any> = T;

export function createGetDictionary<T>(dictionaries: {
  pl: () => Promise<T>;
  de: () => Promise<T>;
  en: () => Promise<T>;
}) {
  return async (locale: Locale): Promise<T> => {
    const supportedLocales: ("pl" | "de" | "en")[] = ["pl", "de", "en"];
    const safeLocale = supportedLocales.includes(locale as "pl" | "de" | "en")
      ? (locale as "pl" | "de" | "en")
      : "pl";

    return dictionaries[safeLocale]();
  };
}
