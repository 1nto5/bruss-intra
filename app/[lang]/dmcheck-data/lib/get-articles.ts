import type { ArticleConfigType } from './types';

export async function getArticles(): Promise<ArticleConfigType[]> {
  const res = await fetch(`${process.env.API}/dmcheck-data/articles`, {
    next: { revalidate: 60 * 60 * 8, tags: ['dmcheck-articles'] },
  });

  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `getArticles error: ${res.status} ${res.statusText} ${json.error}`,
    );
  }

  return await res.json();
}
