'use server';

import { ObjectId } from 'mongodb';
import { dbc } from '@/lib/db/mongo';
import { Locale } from '@/lib/config/i18n';
import * as z from 'zod';
import { getDictionary } from '../lib/dict';
import { createEvaluationPeriodSchema } from '../lib/zod';
import { COLLECTIONS } from '../lib/constants';
import { hasFullAccess } from '../lib/permissions';
import { requireAuth, revalidateCompetencyMatrix } from './utils';

export async function insertEvaluationPeriod(
  data: unknown,
  lang: Locale,
): Promise<{ success: string } | { error: string; issues?: z.ZodIssue[] }> {
  const session = await requireAuth();
  const userRoles = session.user?.roles ?? [];

  if (!hasFullAccess(userRoles)) {
    return { error: 'unauthorized' };
  }

  const dict = await getDictionary(lang);
  const schema = createEvaluationPeriodSchema(dict.validation);
  const result = schema.safeParse(data);

  if (!result.success) {
    return { error: 'validation', issues: result.error.issues };
  }

  try {
    const coll = await dbc(COLLECTIONS.evaluationPeriods);
    const now = new Date();
    const userEmail = session.user!.email as string;

    await coll.insertOne({
      ...result.data,
      createdBy: userEmail,
      createdAt: now,
      updatedAt: now,
    });

    revalidateCompetencyMatrix();
    return { success: 'inserted' };
  } catch (error) {
    console.error('insertEvaluationPeriod error:', error);
    return { error: 'server' };
  }
}

export async function updateEvaluationPeriod(
  id: string,
  data: unknown,
  lang: Locale,
): Promise<{ success: string } | { error: string; issues?: z.ZodIssue[] }> {
  const session = await requireAuth();
  const userRoles = session.user?.roles ?? [];

  if (!hasFullAccess(userRoles)) {
    return { error: 'unauthorized' };
  }

  const dict = await getDictionary(lang);
  const schema = createEvaluationPeriodSchema(dict.validation);
  const result = schema.safeParse(data);

  if (!result.success) {
    return { error: 'validation', issues: result.error.issues };
  }

  try {
    const coll = await dbc(COLLECTIONS.evaluationPeriods);

    await coll.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...result.data,
          updatedAt: new Date(),
        },
      },
    );

    revalidateCompetencyMatrix();
    return { success: 'updated' };
  } catch (error) {
    console.error('updateEvaluationPeriod error:', error);
    return { error: 'server' };
  }
}

export async function deleteEvaluationPeriod(
  id: string,
): Promise<{ success: string } | { error: string }> {
  const session = await requireAuth();
  const userRoles = session.user?.roles ?? [];

  if (!hasFullAccess(userRoles)) {
    return { error: 'unauthorized' };
  }

  try {
    const coll = await dbc(COLLECTIONS.evaluationPeriods);
    await coll.deleteOne({ _id: new ObjectId(id) });

    revalidateCompetencyMatrix();
    return { success: 'deleted' };
  } catch (error) {
    console.error('deleteEvaluationPeriod error:', error);
    return { error: 'server' };
  }
}
