'use server';

import { dbc } from '@/lib/db/mongo';
import { Locale } from '@/lib/config/i18n';
import * as z from 'zod';
import { getDictionary } from '../lib/dict';
import { createCertTypeSchema } from '../lib/zod';
import { COLLECTIONS } from '../lib/constants';
import { revalidateTag } from 'next/cache';
import { hasFullAccess } from '../lib/permissions';
import { requireAuth, revalidateCompetencyMatrix } from './utils';

export async function insertCertificationType(
  data: unknown,
  lang: Locale,
): Promise<{ success: string } | { error: string; issues?: z.ZodIssue[] }> {
  const session = await requireAuth();
  const userRoles = session.user?.roles ?? [];

  if (!hasFullAccess(userRoles)) {
    return { error: 'unauthorized' };
  }

  const dict = await getDictionary(lang);
  const schema = createCertTypeSchema(dict.validation);
  const result = schema.safeParse(data);

  if (!result.success) {
    return { error: 'validation', issues: result.error.issues };
  }

  try {
    const coll = await dbc(COLLECTIONS.competencyMatrixConfigs);
    const existing = await coll.findOne({
      key: 'certification-types',
      'values.slug': result.data.slug,
    });

    if (existing) {
      return { error: 'validation', issues: [{ code: 'custom', path: ['slug'], message: 'Slug already exists' }] };
    }

    await coll.updateOne(
      { key: 'certification-types' },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        $push: { values: result.data } as any,
        $set: {
          updatedAt: new Date(),
          updatedBy: session.user!.email as string,
        },
      },
      { upsert: true },
    );

    revalidateCompetencyMatrix();
    revalidateTag('cert-types', 'max');
    return { success: 'inserted' };
  } catch (error) {
    console.error('insertCertificationType error:', error);
    return { error: 'server' };
  }
}

export async function updateCertificationType(
  slug: string,
  data: unknown,
  lang: Locale,
): Promise<{ success: string } | { error: string; issues?: z.ZodIssue[] }> {
  const session = await requireAuth();
  const userRoles = session.user?.roles ?? [];

  if (!hasFullAccess(userRoles)) {
    return { error: 'unauthorized' };
  }

  const dict = await getDictionary(lang);
  const schema = createCertTypeSchema(dict.validation);
  const result = schema.safeParse(data);

  if (!result.success) {
    return { error: 'validation', issues: result.error.issues };
  }

  try {
    const coll = await dbc(COLLECTIONS.competencyMatrixConfigs);

    await coll.updateOne(
      { key: 'certification-types', 'values.slug': slug },
      {
        $set: {
          'values.$.name': result.data.name,
          updatedAt: new Date(),
          updatedBy: session.user!.email as string,
        },
      },
    );

    revalidateCompetencyMatrix();
    revalidateTag('cert-types', 'max');
    return { success: 'updated' };
  } catch (error) {
    console.error('updateCertificationType error:', error);
    return { error: 'server' };
  }
}

export async function deleteCertificationType(
  slug: string,
): Promise<{ success: string } | { error: string }> {
  const session = await requireAuth();
  const userRoles = session.user?.roles ?? [];

  if (!hasFullAccess(userRoles)) {
    return { error: 'unauthorized' };
  }

  try {
    const coll = await dbc(COLLECTIONS.competencyMatrixConfigs);

    await coll.updateOne(
      { key: 'certification-types' },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        $pull: { values: { slug } } as any,
        $set: {
          updatedAt: new Date(),
          updatedBy: session.user!.email as string,
        },
      },
    );

    revalidateCompetencyMatrix();
    revalidateTag('cert-types', 'max');
    return { success: 'deleted' };
  } catch (error) {
    console.error('deleteCertificationType error:', error);
    return { error: 'server' };
  }
}
