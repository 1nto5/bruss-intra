'use server';

import { UsersListType } from '@/lib/types/user';

export async function getUserSupervisors(): Promise<UsersListType> {
  const res = await fetch(`${process.env.API}/users/supervisors`, {
    next: { revalidate: 60 * 60 * 2, tags: ['users', 'supervisors'] },
  });

  if (!res.ok) {
    const text = await res.text();
    let errorMsg = text;
    try {
      const json = JSON.parse(text);
      errorMsg = json.error || text;
    } catch {}
    throw new Error(
      `getUserSupervisors error: ${res.status} ${res.statusText} ${errorMsg}`,
    );
  }
  return res.json();
}
