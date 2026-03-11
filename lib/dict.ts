import { createGetDictionary } from "@/lib/dict-helpers";
import "server-only";

const dictionaries = {
  pl: () => import("@/app/dict/pl.json").then((module) => module.default),
  de: () => import("@/app/dict/de.json").then((module) => module.default),
  en: () => import("@/app/dict/en.json").then((module) => module.default),
};

export const getDictionary = createGetDictionary(dictionaries);
export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;
