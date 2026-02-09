'use server';

import { auth } from '@/lib/auth';
import { dbc } from '@/lib/db/mongo';
import { ObjectId } from 'mongodb';
import { revalidateProductionOvertime } from './utils';

export async function bulkApproveOvertimeRequests(ids: string[]) {
  console.log('bulkApproveOvertimeRequests', ids);
  const session = await auth();
  if (!session || !session.user?.email) {
    return { error: 'unauthorized' };
  }

  const isPlantManager = (session.user?.roles ?? []).includes('plant-manager');
  const isAdmin = (session.user?.roles ?? []).includes('admin');

  if (!isPlantManager && !isAdmin) {
    return { error: 'unauthorized' };
  }

  try {
    const coll = await dbc('production_overtime');
    const objectIds = ids.map((id) => new ObjectId(id));

    const update = await coll.updateMany(
      {
        _id: { $in: objectIds },
        status: 'pending',
      },
      {
        $set: {
          status: 'approved',
          approvedAt: new Date(),
          approvedBy: session.user.email,
          editedAt: new Date(),
          editedBy: session.user.email,
        },
      },
    );

    revalidateProductionOvertime();

    return {
      success: `${update.modifiedCount} requests approved`,
      count: update.modifiedCount,
    };
  } catch (error) {
    console.error(error);
    return { error: 'bulkApproveOvertimeRequests server action error' };
  }
}

export async function bulkCancelOvertimeRequests(ids: string[]) {
  console.log('bulkCancelOvertimeRequests', ids);
  const session = await auth();
  if (!session || !session.user?.email) {
    return { error: 'unauthorized' };
  }

  try {
    const coll = await dbc('production_overtime');
    const objectIds = ids.map((id) => new ObjectId(id));

    // First get all requests to check permissions
    const requests = await coll.find({ _id: { $in: objectIds } }).toArray();

    // Filter requests that the user can cancel
    const cancellableRequests = requests.filter((request) => {
      // Don't allow canceling if status is completed, accounted, or already canceled
      if (
        request.status === 'completed' ||
        request.status === 'accounted' ||
        request.status === 'canceled'
      ) {
        return false;
      }

      // Check if user has permission to cancel
      return (
        request.requestedBy === session.user.email ||
        session.user.roles?.includes('plant-manager') ||
        session.user.roles?.includes('admin') ||
        session.user.roles?.includes('group-leader') ||
        session.user.roles?.includes('production-manager') ||
        session.user.roles?.includes('hr')
      );
    });

    if (cancellableRequests.length === 0) {
      return { error: 'no requests can be canceled' };
    }

    const cancellableIds = cancellableRequests.map((req) => req._id);

    const update = await coll.updateMany(
      { _id: { $in: cancellableIds } },
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

    revalidateProductionOvertime();

    return {
      success: `${update.modifiedCount} requests canceled`,
      count: update.modifiedCount,
    };
  } catch (error) {
    console.error(error);
    return { error: 'bulkCancelOvertimeRequests server action error' };
  }
}

export async function bulkMarkAsAccountedOvertimeRequests(ids: string[]) {
  console.log('bulkMarkAsAccountedOvertimeRequests', ids);
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
    const objectIds = ids.map((id) => new ObjectId(id));

    const update = await coll.updateMany(
      {
        _id: { $in: objectIds },
        status: 'completed',
      },
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

    revalidateProductionOvertime();

    return {
      success: `${update.modifiedCount} requests marked as accounted`,
      count: update.modifiedCount,
    };
  } catch (error) {
    console.error(error);
    return { error: 'bulkMarkAsAccountedOvertimeRequests server action error' };
  }
}
