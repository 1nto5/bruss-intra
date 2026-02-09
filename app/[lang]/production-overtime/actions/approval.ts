'use server';

import { auth } from '@/lib/auth';
import { dbc } from '@/lib/db/mongo';
import { resolveDisplayName } from '@/lib/utils/name-resolver';
import { ObjectId } from 'mongodb';
import { redirect } from 'next/navigation';
import {
  revalidateProductionOvertime,
  sendEmailNotificationToRequestor,
} from './utils';

export async function approveOvertimeRequest(id: string) {
  console.log('approveOvertimeRequest', id);
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth?callbackUrl=/production-overtime');
  }

  const isPlantManager = (session.user?.roles ?? []).includes('plant-manager');
  const isAdmin = (session.user?.roles ?? []).includes('admin');

  if (!isPlantManager && !isAdmin) {
    return { error: 'unauthorized' };
  }

  try {
    const coll = await dbc('production_overtime');
    const update = await coll.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'approved',
          approvedAt: new Date(),
          approvedBy: session.user.email,
        },
      },
    );
    if (update.matchedCount === 0) {
      return { error: 'not found' };
    }
    revalidateProductionOvertime();
    const approverName = await resolveDisplayName(session.user.email);
    await sendEmailNotificationToRequestor(session.user.email, id, approverName);
    return { success: 'approved' };
  } catch (error) {
    console.error(error);
    return { error: 'approveOvertimeRequest server action error' };
  }
}

export async function cancelOvertimeRequest(id: string) {
  console.log('cancelOvertimeRequest', id);
  const session = await auth();
  if (!session || !session.user?.email) {
    return { error: 'unauthorized' };
  }

  try {
    const coll = await dbc('production_overtime');

    // First check if the request exists and get its current status
    const request = await coll.findOne({ _id: new ObjectId(id) });
    if (!request) {
      return { error: 'not found' };
    }

    // Don't allow canceling if status is completed, accounted, or already canceled
    if (
      request.status === 'completed' ||
      request.status === 'accounted' ||
      request.status === 'canceled'
    ) {
      return { error: 'cannot cancel' };
    }

    // Check if user has permission to cancel (requestor, plant manager, admin, group leader, production manager, or HR)
    if (
      request.requestedBy !== session.user.email &&
      !session.user.roles?.includes('plant-manager') &&
      !session.user.roles?.includes('admin') &&
      !session.user.roles?.includes('group-leader') &&
      !session.user.roles?.includes('production-manager') &&
      !session.user.roles?.includes('hr')
    ) {
      return { error: 'unauthorized' };
    }

    const update = await coll.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'canceled',
          canceledAt: new Date(),
          canceledBy: session.user.email,
          editedAt: new Date(),
          editedBy: session.user.email,
        },
      },
    );

    if (update.matchedCount === 0) {
      return { error: 'not found' };
    }

    revalidateProductionOvertime();
    return { success: 'canceled' };
  } catch (error) {
    console.error(error);
    return { error: 'cancelOvertimeRequest server action error' };
  }
}

export async function markAsAccountedOvertimeRequest(id: string) {
  console.log('markAsAccountedOvertimeRequest', id);
  const session = await auth();
  if (!session || !session.user?.email) {
    return { error: 'unauthorized' };
  }

  const isHR = (session.user?.roles ?? []).includes('hr');

  if (!isHR) {
    return { error: 'unauthorized' };
  }

  try {
    const coll = await dbc('production_overtime');

    // First check if the request exists and get its current status
    const request = await coll.findOne({ _id: new ObjectId(id) });
    if (!request) {
      return { error: 'not found' };
    }

    // Only allow marking as accounted if status is completed
    if (request.status !== 'completed') {
      return { error: 'invalid status' };
    }

    const update = await coll.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'accounted',
          accountedAt: new Date(),
          accountedBy: session.user.email,
          editedAt: new Date(),
          editedBy: session.user.email,
        },
      },
    );

    if (update.matchedCount === 0) {
      return { error: 'not found' };
    }

    revalidateProductionOvertime();
    return { success: 'accounted' };
  } catch (error) {
    console.error(error);
    return { error: 'markAsAccountedOvertimeRequest server action error' };
  }
}
