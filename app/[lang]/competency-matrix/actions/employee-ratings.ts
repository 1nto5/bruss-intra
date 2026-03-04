'use server';

import { dbc } from '@/lib/db/mongo';
import { Locale } from '@/lib/config/i18n';
import * as z from 'zod';
import { getDictionary } from '../lib/dict';
import { createEmployeeRatingsSchema } from '../lib/zod';
import { COLLECTIONS } from '../lib/constants';
import { canManageCompetencies } from '../lib/permissions';
import { revalidateTag } from 'next/cache';
import { requireAuth } from './utils';

export async function saveEmployeeRatings(
  data: unknown,
  lang: Locale,
): Promise<{ success: string } | { error: string; issues?: z.ZodIssue[] }> {
  const session = await requireAuth();
  const userRoles = session.user?.roles ?? [];

  if (!canManageCompetencies(userRoles)) {
    return { error: 'unauthorized' };
  }

  const dict = await getDictionary(lang);
  const schema = createEmployeeRatingsSchema(dict.validation);
  const result = schema.safeParse(data);

  if (!result.success) {
    return { error: 'validation', issues: result.error.issues };
  }

  try {
    const coll = await dbc(COLLECTIONS.employeeRatings);
    const userEmail = session.user!.email as string;

    await coll.updateOne(
      { employeeIdentifier: result.data.employeeIdentifier },
      {
        $set: {
          ratings: result.data.ratings,
          updatedAt: new Date(),
          updatedBy: userEmail,
        },
      },
      { upsert: true },
    );

    revalidateTag('competency-matrix-employee-ratings', 'max');
    return { success: 'saved' };
  } catch (error) {
    console.error('saveEmployeeRatings error:', error);
    return { error: 'server' };
  }
}
