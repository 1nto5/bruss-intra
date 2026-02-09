import type { DefectType } from './types';

export async function getDefects(): Promise<DefectType[]> {
  const res = await fetch(`${process.env.API}/dmcheck-data/defects`, {
    next: { revalidate: 60 * 60 * 8, tags: ['dmcheck-defects'] },
  });

  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `getDefects error: ${res.status} ${res.statusText} ${json.error}`,
    );
  }

  return await res.json();
}
