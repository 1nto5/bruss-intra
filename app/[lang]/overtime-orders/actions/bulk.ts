'use server';

import { auth } from '@/lib/auth';
import { dbc } from '@/lib/db/mongo';
import { ObjectId } from 'mongodb';
import { redirect } from 'next/navigation';
import { revalidateOvertimeOrders, sendEmailNotificationToRequestor } from './utils';

// Bulk Actions
export async function bulkPreApproveOvertimeRequests(ids: string[]) {
  console.log('bulkPreApproveOvertimeRequests', ids);
  const session = await auth();
  if (!session || !session.user?.email) {
    return { error: 'unauthorized' };
  }

  const isProductionManager = (session.user?.roles ?? []).includes('production-manager');
  const isAdmin = (session.user?.roles ?? []).includes('admin');

  if (!isProductionManager && !isAdmin) {
    return { error: 'unauthorized' };
  }

  try {
    const coll = await dbc('overtime_orders');
    const objectIds = ids.map((id) => new ObjectId(id));

    // Fetch pending orders that are NOT logistics (logistics skips pre-approval)
    const orders = await coll
      .find({
        _id: { $in: objectIds },
        status: 'pending',
        department: { $ne: 'logistics' },
      })
      .toArray();

    if (orders.length === 0) {
      return { error: 'no eligible requests found' };
    }

    const eligibleIds = orders.map((o) => o._id);

    const update = await coll.updateMany(
      { _id: { $in: eligibleIds } },
      {
        $set: {
          status: 'pre_approved',
          preApprovedAt: new Date(),
          preApprovedBy: session.user.email,
          editedAt: new Date(),
          editedBy: session.user.email,
        },
      },
    );

    revalidateOvertimeOrders();

    // Send email notifications
    for (const order of orders) {
      try {
        await sendEmailNotificationToRequestor(order.requestedBy, order._id.toString(), {
          workStartTime: order.workStartTime,
          workEndTime: order.workEndTime,
          hours: order.hours,
          payment: order.payment,
          scheduledDayOff: order.scheduledDayOff,
        });
      } catch (emailError) {
        console.error(`Failed to send email for order ${order._id}:`, emailError);
      }
    }

    return {
      success: `${update.modifiedCount} requests pre-approved`,
      count: update.modifiedCount,
    };
  } catch (error) {
    console.error(error);
    return { error: 'bulkPreApproveOvertimeRequests server action error' };
  }
}

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
    const coll = await dbc('overtime_orders');
    const objectIds = ids.map((id) => new ObjectId(id));

    // Fetch orders that can be approved:
    // - logistics: pending status
    // - other departments: pre_approved status
    const orders = await coll
      .find({
        _id: { $in: objectIds },
        $or: [
          { department: 'logistics', status: 'pending' },
          { department: { $ne: 'logistics' }, status: 'pre_approved' },
        ],
      })
      .toArray();

    if (orders.length === 0) {
      return { error: 'no eligible requests found' };
    }

    const eligibleIds = orders.map((o) => o._id);

    const update = await coll.updateMany(
      { _id: { $in: eligibleIds } },
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

    revalidateOvertimeOrders();

    // Send email notifications to each requestor
    for (const order of orders) {
      try {
        await sendEmailNotificationToRequestor(
          order.requestedBy,
          order._id.toString(),
          {
            workStartTime: order.workStartTime,
            workEndTime: order.workEndTime,
            hours: order.hours,
            payment: order.payment,
            scheduledDayOff: order.scheduledDayOff,
          },
        );
      } catch (emailError) {
        console.error(
          `Failed to send email for order ${order._id}:`,
          emailError,
        );
        // Continue even if email fails
      }
    }

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
    const coll = await dbc('overtime_orders');
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

    revalidateOvertimeOrders();

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
    const coll = await dbc('overtime_orders');
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

    revalidateOvertimeOrders();

    return {
      success: `${update.modifiedCount} requests marked as accounted`,
      count: update.modifiedCount,
    };
  } catch (error) {
    console.error(error);
    return { error: 'bulkMarkAsAccountedOvertimeRequests server action error' };
  }
}

export async function bulkDeleteOvertimeRequests(ids: string[]) {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth');
  }

  // Only admins can delete orders
  const isAdmin = (session.user?.roles ?? []).includes('admin');
  if (!isAdmin) {
    return { error: 'unauthorized' };
  }

  try {
    const coll = await dbc('overtime_orders');

    // Handle both ObjectIds and string IDs
    const convertedIds: ObjectId[] = ids.map((id) => {
      try {
        // Try to convert to ObjectId first
        return new ObjectId(id);
      } catch {
        // If it fails, create a new ObjectId (this should rarely happen)
        // In production, all IDs should be valid ObjectId strings
        throw new Error(`Invalid ObjectId format: ${id}`);
      }
    });

    const deleteResult = await coll.deleteMany({ _id: { $in: convertedIds } });

    revalidateOvertimeOrders();
    return {
      success: 'deleted',
      count: deleteResult.deletedCount,
    };
  } catch (error) {
    console.error(error);
    return { error: 'bulkDeleteOvertimeRequests server action error' };
  }
}
