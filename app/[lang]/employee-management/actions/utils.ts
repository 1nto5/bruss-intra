'use server';

import { revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';

export async function revalidateEmployees() {
  revalidateTag('employees', { expire: 0 });
}

export async function redirectToEmployees(lang: string) {
  redirect(`/${lang}/employee-management`);
}
