'use server';

import { revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';

export async function revalidateConfigs() {
  revalidateTag('dmcheck-articles', { expire: 0 });
}

export async function redirectToConfigs(lang: string) {
  redirect(`/${lang}/dmcheck-configs`);
}
