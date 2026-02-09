'use server';

import { revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';

export async function revalidateCards() {
  revalidateTag('inventory-cards', { expire: 0 });
}

export async function revalidateCardPositions() {
  revalidateTag('inventory-card-positions', { expire: 0 });
}

export async function revalidatePositions() {
  revalidateTag('inventory-positions', { expire: 0 });
}

export async function revalidateAll() {
  revalidateTag('inventory-cards', { expire: 0 });
  revalidateTag('inventory-card-positions', { expire: 0 });
  revalidateTag('inventory-positions', { expire: 0 });
}

export async function redirectToCardPositions(lang: string, cardNumber: string) {
  redirect(`/${lang}/inventory/${cardNumber}`);
}
