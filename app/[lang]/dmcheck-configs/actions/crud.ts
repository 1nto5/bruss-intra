'use server';

import { auth } from '@/lib/auth';
import { Locale } from '@/lib/config/i18n';
import { dbc } from '@/lib/db/mongo';
import { ObjectId } from 'mongodb';
import { revalidateTag } from 'next/cache';
import * as z from 'zod';
import { getDictionary } from '../lib/dict';
import { createDmcheckConfigSchema } from '../lib/zod';

export async function insertConfig(
  data: unknown,
  lang: Locale,
): Promise<{ success: string } | { error: string; issues?: z.ZodIssue[] }> {
  const session = await auth();
  if (!session || !session.user?.email) {
    return { error: 'unauthorized' };
  }

  if (!session.user.roles?.includes('admin')) {
    return { error: 'unauthorized' };
  }

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

    const res = await coll.insertOne({
      workplace: validatedData.workplace,
      articleNumber: validatedData.articleNumber,
      articleName: validatedData.articleName,
      articleNote: validatedData.articleNote ?? '',
      piecesPerBox: validatedData.piecesPerBox,
      dmc: validatedData.dmc,
      dmcFirstValidation: validatedData.dmcFirstValidation,
      secondValidation: validatedData.secondValidation ?? false,
      dmcSecondValidation: validatedData.dmcSecondValidation ?? '',
      hydraProcess: validatedData.hydraProcess,
      ford: validatedData.ford ?? false,
      bmw: validatedData.bmw ?? false,
      nonUniqueHydraBatch: validatedData.nonUniqueHydraBatch ?? false,
      requireDmcPartVerification:
        validatedData.requireDmcPartVerification ?? false,
      enableDefectReporting: validatedData.enableDefectReporting ?? false,
      requireDefectApproval: validatedData.requireDefectApproval ?? false,
      defectGroup: validatedData.defectGroup ?? '',
    });

    if (res) {
      revalidateTag('dmcheck-articles', { expire: 0 });
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
  const session = await auth();
  if (!session || !session.user?.email) {
    return { error: 'unauthorized' };
  }

  if (!session.user.roles?.includes('admin')) {
    return { error: 'unauthorized' };
  }

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

    const res = await coll.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          workplace: validatedData.workplace,
          articleNumber: validatedData.articleNumber,
          articleName: validatedData.articleName,
          articleNote: validatedData.articleNote ?? '',
          piecesPerBox: validatedData.piecesPerBox,
          dmc: validatedData.dmc,
          dmcFirstValidation: validatedData.dmcFirstValidation,
          secondValidation: validatedData.secondValidation ?? false,
          dmcSecondValidation: validatedData.dmcSecondValidation ?? '',
          hydraProcess: validatedData.hydraProcess,
          ford: validatedData.ford ?? false,
          bmw: validatedData.bmw ?? false,
          nonUniqueHydraBatch: validatedData.nonUniqueHydraBatch ?? false,
          requireDmcPartVerification:
            validatedData.requireDmcPartVerification ?? false,
          enableDefectReporting:
            validatedData.enableDefectReporting ?? false,
          requireDefectApproval:
            validatedData.requireDefectApproval ?? false,
          defectGroup: validatedData.defectGroup ?? '',
        },
      },
    );

    if (res.modifiedCount > 0) {
      revalidateTag('dmcheck-articles', { expire: 0 });
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
  const session = await auth();
  if (!session || !session.user?.email) {
    return { error: 'unauthorized' };
  }

  if (!session.user.roles?.includes('admin')) {
    return { error: 'unauthorized' };
  }

  try {
    const coll = await dbc('dmcheck_configs');

    const res = await coll.deleteOne({ _id: new ObjectId(id) });

    if (res.deletedCount > 0) {
      revalidateTag('dmcheck-articles', { expire: 0 });
      return { success: 'deleted' };
    } else {
      return { error: 'not found' };
    }
  } catch (error) {
    console.error(error);
    return { error: 'deleteConfig server action error' };
  }
}
