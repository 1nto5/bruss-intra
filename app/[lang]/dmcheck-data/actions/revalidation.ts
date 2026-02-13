'use server';

import { revalidateTag } from 'next/cache';

export async function revalidateDmcheckTableData() {
  revalidateTag('dmcheck-data-dmc', { expire: 0 });
}

export const revalidateDmcheckDefectsData = revalidateDmcheckTableData;
