'use server';

import { revalidateTag } from 'next/cache';

export async function revalidateFailures() {
  revalidateTag('failures-lv', { expire: 0 });
}
