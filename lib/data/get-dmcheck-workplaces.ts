'use server';

export default async function getDmcheckWorkplaces(
  userRoles: string[],
): Promise<string[]> {
  const params = new URLSearchParams({
    userRoles: userRoles.join(','),
  });

  const res = await fetch(
    `${process.env.API}/dmcheck-configs/workplaces?${params}`,
    {
      next: { revalidate: 0, tags: ['dmcheck-configs'] },
    },
  );

  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `getDmcheckWorkplaces error: ${res.status} ${res.statusText} ${json.error}`,
    );
  }

  return res.json();
}
