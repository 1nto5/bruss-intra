'use server';

import { revalidateTag } from 'next/cache';
// import { redirect } from 'next/navigation';

export async function revalidateCardPositions() {
  revalidateTag('inventory-card-positions', { expire: 0 });
}
