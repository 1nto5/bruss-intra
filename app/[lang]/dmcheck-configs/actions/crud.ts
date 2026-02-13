'use server';

import { auth } from '@/lib/auth';
import { Locale } from '@/lib/config/i18n';
import { dbc } from '@/lib/db/mongo';
import { ObjectId } from 'mongodb';
import { revalidateTag } from 'next/cache';
import * as z from 'zod';
import { getDictionary } from '../lib/dict';
import { createDmcheckConfigSchema } from '../lib/zod';

type ConfigSchemaData = z.infer<ReturnType<typeof createDmcheckConfigSchema>>;

function toConfigDocument(data: ConfigSchemaData): Record<string, unknown> {
  return {
    workplace: data.workplace,
    articleNumber: data.articleNumber,
    articleName: data.articleName,
    articleNote: data.articleNote ?? '',
    piecesPerBox: data.piecesPerBox,
    dmc: data.dmc,
    dmcFirstValidation: data.dmcFirstValidation,
    secondValidation: data.secondValidation ?? false,
    dmcSecondValidation: data.dmcSecondValidation ?? '',
    hydraProcess: data.hydraProcess,
    ford: data.ford ?? false,
    bmw: data.bmw ?? false,
    nonUniqueHydraBatch: data.nonUniqueHydraBatch ?? false,
    requireDmcPartVerification: data.requireDmcPartVerification ?? false,
    enableDefectReporting: data.enableDefectReporting ?? false,
    requireDefectApproval: data.requireDefectApproval ?? false,
    defectGroup: data.defectGroup ?? '',
  };
}

function revalidateConfigTags(): void {
  revalidateTag('dmcheck-articles', { expire: 0 });
  revalidateTag('dmcheck-configs', { expire: 0 });
}

async function requireAdmin(): Promise<{ error: string } | null> {
  const session = await auth();
  if (!session?.user?.email || !session.user.roles?.includes('admin')) {
    return { error: 'unauthorized' };
  }
  return null;
}

export async function insertConfig(
  data: unknown,
  lang: Locale,
): Promise<{ success: string } | { error: string; issues?: z.ZodIssue[] }> {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const dict = await getDictionary(lang);
    const schema = createDmcheckConfigSchema(dict.validation);
    const result = schema.safeParse(data);

    if (!result.success) {
      return { error: 'validation', issues: result.error.issues };
    }

    const validatedData = result.data;

    const coll = await dbc('dmcheck_configs');

    // Check for duplicate workplace + articleNumber combo
    const existing = await coll.findOne({
      workplace: validatedData.workplace,
      articleNumber: validatedData.articleNumber,
    });
    if (existing) {
      return { error: 'duplicate config' };
    }

    const doc = toConfigDocument(validatedData);

    const res = await coll.insertOne(doc);

    if (res) {
      revalidateConfigTags();
      return { success: 'inserted' };
    } else {
      return { error: 'not inserted' };
    }
  } catch (error) {
    console.error(error);
    return { error: 'insertConfig server action error' };
  }
}

export async function updateConfig(
  id: string,
  data: unknown,
  lang: Locale,
): Promise<{ success: string } | { error: string; issues?: z.ZodIssue[] }> {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const dict = await getDictionary(lang);
    const schema = createDmcheckConfigSchema(dict.validation);
    const result = schema.safeParse(data);

    if (!result.success) {
      return { error: 'validation', issues: result.error.issues };
    }

    const validatedData = result.data;

    const coll = await dbc('dmcheck_configs');

    const existingItem = await coll.findOne({ _id: new ObjectId(id) });
    if (!existingItem) {
      return { error: 'not found' };
    }

    const doc = toConfigDocument(validatedData);

    const res = await coll.updateOne(
      { _id: new ObjectId(id) },
      { $set: doc },
    );

    if (res.modifiedCount > 0) {
      revalidateConfigTags();
      return { success: 'updated' };
    } else {
      return { error: 'not updated' };
    }
  } catch (error) {
    console.error(error);
    return { error: 'updateConfig server action error' };
  }
}

export async function deleteConfig(
  id: string,
): Promise<{ success: string } | { error: string }> {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const coll = await dbc('dmcheck_configs');

    const res = await coll.deleteOne({ _id: new ObjectId(id) });

    if (res.deletedCount > 0) {
      revalidateConfigTags();
      return { success: 'deleted' };
    } else {
      return { error: 'not found' };
    }
  } catch (error) {
    console.error(error);
    return { error: 'deleteConfig server action error' };
  }
}
