'use server';

import { UsersListType } from '@/lib/types/user';

export async function getSubmissionSupervisors(): Promise<UsersListType> {
  const res = await fetch(`${process.env.API}/overtime-submissions/supervisors`, {
    next: { revalidate: 60 * 60 * 2, tags: ['overtime-submissions', 'supervisors'] },
  });

  if (!res.ok) {
    const text = await res.text();
    let errorMsg = text;
    try {
      const json = JSON.parse(text);
      errorMsg = json.error || text;
    } catch {}
    throw new Error(
      `getSubmissionSupervisors error: ${res.status} ${res.statusText} ${errorMsg}`,
    );
  }
  return res.json();
}
