"use server";

import type { ConfigValue } from "@/app/[lang]/competency-matrix/lib/types";

export default async function getCertTypes(): Promise<ConfigValue[]> {
  const res = await fetch(`${process.env.API}/competency-matrix/cert-types`, {
    next: {
      revalidate: 60 * 60 * 8, // 8 hours
      tags: ["cert-types"],
    },
  });

  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `getCertTypes error:  ${res.status}  ${res.statusText} ${json.error}`,
    );
  }
  const data = await res.json();
  return data;
}
