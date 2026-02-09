'use server';

import { dbc } from '@/lib/db/mongo';
import { Locale } from '@/lib/config/i18n';
import { ObjectId } from 'mongodb';
import { revalidateTag } from 'next/cache';
import { getDictionary } from '../../../lib/dict';
import { createAddFailureSchema, createUpdateFailureSchema } from '../lib/zod';
import * as z from 'zod';

export async function insertFailure(
  data: unknown,
  lang: Locale,
): Promise<{ success: string } | { error: string; issues?: z.ZodIssue[] }> {
  try {
    const dict = await getDictionary(lang);
    const schema = createAddFailureSchema(dict.validation);
    const result = schema.safeParse(data);

    if (!result.success) {
      return { error: 'validation', issues: result.error.issues };
    }

    const validatedData = result.data;
    const collection = await dbc('failures_lv');
    const res = await collection.insertOne({
      ...validatedData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (res) {
      revalidateTag('failures-lv', { expire: 0 });
      return { success: 'inserted' };
    } else {
      return { error: 'not inserted' };
    }
  } catch (error) {
    console.error(error);
    return { error: 'insertFailure server action error' };
  }
}

export async function updateFailure(
  data: unknown,
  lang: Locale,
): Promise<{ success: string } | { error: string; issues?: z.ZodIssue[] }> {
  try {
    const dict = await getDictionary(lang);
    const schema = createUpdateFailureSchema(dict.validation);
    const result = schema.safeParse(data);

    if (!result.success) {
      return { error: 'validation', issues: result.error.issues };
    }

    const validatedData = result.data;
    const { _id, ...updateFields } = {
      ...validatedData,
      updatedAt: new Date(),
    };

    const collection = await dbc('failures_lv');
    const res = await collection.updateOne(
      { _id: new ObjectId(_id) },
      { $set: updateFields },
    );

    if (res.matchedCount > 0) {
      revalidateTag('failures-lv', { expire: 0 });
      return { success: 'updated' };
    } else {
      return { error: 'not updated' };
    }
  } catch (error) {
    console.error(error);
    return { error: 'updateFailure server action error' };
  }
}

export async function endFailure(id: string) {
  try {
    const collection = await dbc('failures_lv');

    const res = await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          to: new Date(),
          updatedAt: new Date(),
        },
      },
    );

    if (res.matchedCount > 0) {
      revalidateTag('failures-lv', { expire: 0 });
      return { success: 'ended' };
    }
    return { error: 'not ended' };
  } catch (error) {
    console.error(error);
    return { error: 'endFailure server action error' };
  }
}
