'use server';

import { auth } from '@/lib/auth';
import { dbc } from '@/lib/db/mongo';
import { ObjectId } from 'mongodb';
import { redirect } from 'next/navigation';
import { revalidateOvertimeOrders, revalidateOvertimeOrdersRequest, sendEmailNotificationToRequestor } from './utils';

export async function preApproveOvertimeRequest(id: string) {
  console.log('preApproveOvertimeRequest', id);
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth');
  }

  const isProductionManager = (session.user?.roles ?? []).includes('production-manager');
  const isAdmin = (session.user?.roles ?? []).includes('admin');

  if (!isProductionManager && !isAdmin) {
    return { error: 'unauthorized' };
  }

  try {
    const coll = await dbc('overtime_orders');

    const order = await coll.findOne({ _id: new ObjectId(id) });
    if (!order) {
      return { error: 'not found' };
    }

    // Only pending orders can be pre-approved
    if (order.status !== 'pending') {
      return { error: 'invalid status' };
    }

    // Logistics orders don't require pre-approval
    if (order.department === 'logistics') {
      return { error: 'logistics orders do not require pre-approval' };
    }

    const update = await coll.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'pre_approved',
          preApprovedAt: new Date(),
          preApprovedBy: session.user.email,
        },
      },
    );
    if (update.matchedCount === 0) {
      return { error: 'not found' };
    }
    revalidateOvertimeOrders();
    await sendEmailNotificationToRequestor(order.requestedBy, id, {
      workStartTime: order.workStartTime,
      workEndTime: order.workEndTime,
      hours: order.hours,
      payment: order.payment,
      scheduledDayOff: order.scheduledDayOff,
    });
    return { success: 'pre_approved' };
  } catch (error) {
    console.error(error);
    return { error: 'preApproveOvertimeRequest server action error' };
  }
}

export async function approveOvertimeRequest(id: string) {
  console.log('approveOvertimeRequest', id);
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth');
  }

  const isPlantManager = (session.user?.roles ?? []).includes('plant-manager');
  const isAdmin = (session.user?.roles ?? []).includes('admin');

  if (!isPlantManager && !isAdmin) {
    return { error: 'unauthorized' };
  }

  try {
    const coll = await dbc('overtime_orders');

    // First, get the order to retrieve requestor's email
    const order = await coll.findOne({ _id: new ObjectId(id) });
    if (!order) {
      return { error: 'not found' };
    }

    // Logistics can be approved directly from pending
    // Other departments require pre_approved status
    const isLogistics = order.department === 'logistics';
    const validStatus = isLogistics
      ? order.status === 'pending'
      : order.status === 'pre_approved';

    if (!validStatus) {
      return { error: 'invalid status' };
    }

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
    revalidateOvertimeOrders();
    await sendEmailNotificationToRequestor(order.requestedBy, id, {
      workStartTime: order.workStartTime,
      workEndTime: order.workEndTime,
      hours: order.hours,
      payment: order.payment,
      scheduledDayOff: order.scheduledDayOff,
    });
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
    const coll = await dbc('overtime_orders');

    // Handle both ObjectId and string ID formats
    let convertedId: ObjectId;
    try {
      convertedId = new ObjectId(id);
    } catch {
      // If conversion fails, return error as this shouldn't happen
      return { error: 'invalid id format' };
    }

    // First check if the request exists and get its current status
    const request = await coll.findOne({ _id: convertedId });
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
      { _id: convertedId },
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

    revalidateOvertimeOrders();
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
    const coll = await dbc('overtime_orders');

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

    revalidateOvertimeOrders();
    return { success: 'accounted' };
  } catch (error) {
    console.error(error);
    return { error: 'markAsAccountedOvertimeRequest server action error' };
  }
}

export async function reactivateOvertimeRequest(id: string) {
  console.log('reactivateOvertimeRequest', id);
  const session = await auth();
  if (!session || !session.user?.email) {
    return { error: 'unauthorized' };
  }

  // Only admins and HR can reactivate orders
  const isAdmin = (session.user?.roles ?? []).includes('admin');
  const isHR = (session.user?.roles ?? []).includes('hr');
  if (!isAdmin && !isHR) {
    return { error: 'unauthorized' };
  }

  try {
    const coll = await dbc('overtime_orders');

    // First check if the request exists and get its current status
    const request = await coll.findOne({ _id: new ObjectId(id) });
    if (!request) {
      return { error: 'not found' };
    }

    // Only allow reactivating if status is canceled
    if (request.status !== 'canceled') {
      return { error: 'invalid status' };
    }

    // Update the request back to pending status
    const update = await coll.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'pending',
          reactivatedAt: new Date(),
          reactivatedBy: session.user.email,
          editedAt: new Date(),
          editedBy: session.user.email,
        },
        $unset: {
          canceledAt: '',
          canceledBy: '',
        },
      },
    );

    if (update.matchedCount === 0) {
      return { error: 'not found' };
    }

    revalidateOvertimeOrders();
    revalidateOvertimeOrdersRequest();
    return { success: 'reactivated' };
  } catch (error) {
    console.error(error);
    return { error: 'reactivateOvertimeRequest server action error' };
  }
}
