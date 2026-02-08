'use server';

import { auth } from '@/lib/auth';
import { Locale } from '@/lib/config/i18n';
import { plant } from '@/lib/config/plant';
import { dbc } from '@/lib/db/mongo';
import { ObjectId } from 'mongodb';
import { revalidateTag } from 'next/cache';
import * as z from 'zod';
import { getDictionary } from '../lib/dict';
import { createEmployeeSchema } from '../lib/zod';

export async function insertEmployee(
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

  if (plant !== 'bri') {
    return { error: 'plant restricted' };
  }

  try {
    const dict = await getDictionary(lang);
    const schema = createEmployeeSchema(dict.validation);
    const result = schema.safeParse(data);

    if (!result.success) {
      return { error: 'validation', issues: result.error.issues };
    }

    const validatedData = result.data;

    const coll = await dbc('employees');

    // Check for duplicate identifier
    const existing = await coll.findOne({
      identifier: validatedData.identifier,
    });
    if (existing) {
      return { error: 'duplicate identifier' };
    }

    const res = await coll.insertOne({
      identifier: validatedData.identifier,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      createdAt: new Date(),
      createdBy: session.user.email,
      editedAt: new Date(),
      editedBy: session.user.email,
    });

    if (res) {
      revalidateTag('employees', { expire: 0 });
      return { success: 'inserted' };
    } else {
      return { error: 'not inserted' };
    }
  } catch (error) {
    console.error(error);
    return { error: 'insertEmployee server action error' };
  }
}

export async function updateEmployee(
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
    const schema = createEmployeeSchema(dict.validation);
    const result = schema.safeParse(data);

    if (!result.success) {
      return { error: 'validation', issues: result.error.issues };
    }

    const validatedData = result.data;

    const coll = await dbc('employees');

    const existingItem = await coll.findOne({ _id: new ObjectId(id) });
    if (!existingItem) {
      return { error: 'not found' };
    }

    const res = await coll.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          editedAt: new Date(),
          editedBy: session.user.email,
        },
      },
    );

    if (res.modifiedCount > 0) {
      revalidateTag('employees', { expire: 0 });
      return { success: 'updated' };
    } else {
      return { error: 'not updated' };
    }
  } catch (error) {
    console.error(error);
    return { error: 'updateEmployee server action error' };
  }
}

export async function deleteEmployee(
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
    const coll = await dbc('employees');

    const res = await coll.deleteOne({ _id: new ObjectId(id) });

    if (res.deletedCount > 0) {
      revalidateTag('employees', { expire: 0 });
      return { success: 'deleted' };
    } else {
      return { error: 'not found' };
    }
  } catch (error) {
    console.error(error);
    return { error: 'deleteEmployee server action error' };
  }
}
