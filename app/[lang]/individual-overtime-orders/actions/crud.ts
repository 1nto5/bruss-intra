'use server';

import { redirectToAuth } from '@/app/[lang]/actions';
import { auth } from '@/lib/auth';
import { dbc } from '@/lib/db/mongo';
import { ObjectId } from 'mongodb';
import { revalidateTag } from 'next/cache';
import { extractNameFromEmail } from '@/lib/utils/name-format';
import { IndividualOvertimeOrderType } from '../lib/types';
import { generateNextInternalId, sendCreationEmailToEmployee } from './utils';

/**
 * Insert new individual overtime order
 *
 * Manager/Leader creates for employee (employeeIdentifier required):
 * - Supervisor approval is implicit (manager created it)
 * - Payout orders: starts at 'pending-plant-manager'
 * - Time-off orders: starts at 'approved'
 * - Email notification sent only if employee has email in Employees collection
 */
export async function insertOrder(
  data: IndividualOvertimeOrderType,
  employeeIdentifier: string,
): Promise<{ success: 'inserted' } | { error: string }> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirectToAuth();
  }
  const userEmail = session!.user!.email as string;
  const userRoles = session!.user!.roles ?? [];
  const isHR = userRoles.includes('hr');
  const isAdmin = userRoles.includes('admin');
  const isManager = userRoles.some(
    (role: string) =>
      role.toLowerCase().includes('manager') ||
      role.toLowerCase().includes('leader'),
  );

  // Only managers, HR, or admins can create orders
  if (!isHR && !isAdmin && !isManager) {
    return { error: 'unauthorized' };
  }

  // Lookup employee from Employees collection
  const employeesColl = await dbc('employees');
  const employee = await employeesColl.findOne({ identifier: employeeIdentifier });
  if (!employee) {
    return { error: 'employee not found' };
  }

  // Get employee email (optional)
  const employeeEmail = employee.email || undefined;

  // Determine initial status based on payment type
  // Manager created for employee - supervisor approval is implicit
  let initialStatus: string;
  let supervisorApprovedAt: Date | undefined;
  let supervisorApprovedBy: string | undefined;
  let approvedAt: Date | undefined;
  let approvedBy: string | undefined;

  if (data.payment) {
    // Payout orders need plant manager approval
    initialStatus = 'pending-plant-manager';
    supervisorApprovedAt = new Date();
    supervisorApprovedBy = userEmail;
  } else {
    // Time-off orders are approved immediately
    initialStatus = 'approved';
    supervisorApprovedAt = new Date();
    supervisorApprovedBy = userEmail;
    approvedAt = new Date();
    approvedBy = userEmail;
  }

  try {
    const coll = await dbc('individual_overtime_orders');

    const internalId = await generateNextInternalId();

    // Exclude _id from insert (MongoDB will generate it)
    const { _id, ...dataWithoutId } = data;

    const orderToInsert = {
      internalId,
      ...dataWithoutId,
      employeeIdentifier,
      ...(employeeEmail && { employeeEmail }),
      supervisor: userEmail, // Logged-in manager is the supervisor
      createdBy: userEmail,
      status: initialStatus,
      payment: data.payment ?? false,
      submittedAt: new Date(),
      supervisorApprovedAt,
      supervisorApprovedBy,
      ...(approvedAt && { approvedAt }),
      ...(approvedBy && { approvedBy }),
      editedAt: new Date(),
      editedBy: userEmail,
    };

    const res = await coll.insertOne(orderToInsert);
    if (res) {
      revalidateTag('individual-overtime-orders', { expire: 0 });

      // Send creation email to employee if they have email
      if (employeeEmail) {
        try {
          await sendCreationEmailToEmployee(
            employeeEmail,
            res.insertedId.toString(),
            data.payment ?? false,
            extractNameFromEmail(userEmail),
            data.scheduledDayOff,
            data.workStartTime,
            data.workEndTime,
            data.hours,
          );
        } catch (emailError) {
          console.error('Failed to send creation email:', emailError);
          // Don't fail the whole operation if email fails
        }
      }

      return { success: 'inserted' };
    } else {
      return { error: 'not inserted' };
    }
  } catch (error) {
    console.error(error);
    return { error: 'insertOrder server action error' };
  }
}

/**
 * Update individual overtime order (employee self-edit)
 * Only submitter can edit, only when status is 'pending'
 */
export async function updateOrder(
  id: string,
  data: IndividualOvertimeOrderType,
): Promise<{ success: 'updated' } | { error: string }> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirectToAuth();
  }
  const userEmail = session!.user!.email;

  try {
    const coll = await dbc('individual_overtime_orders');

    const order = await coll.findOne({ _id: new ObjectId(id) });
    if (!order) {
      return { error: 'not found' };
    }

    // Only the submitter can edit their own order, and only if it's pending
    if (order.submittedBy !== userEmail) {
      return { error: 'unauthorized' };
    }

    if (order.status !== 'pending') {
      return { error: 'invalid status' };
    }

    // Prevent editing the payment field after submission
    const updateData = { ...data, payment: order.payment };

    // Remove _id from updateData
    const { _id: _, ...updateDataWithoutId } = updateData;

    const update = await coll.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...updateDataWithoutId,
          editedAt: new Date(),
          editedBy: userEmail,
        },
      },
    );

    if (update.matchedCount === 0) {
      return { error: 'not found' };
    }

    revalidateTag('individual-overtime-orders', { expire: 0 });
    return { success: 'updated' };
  } catch (error) {
    console.error(error);
    return { error: 'updateOrder server action error' };
  }
}

/**
 * Unified correction action for individual overtime orders
 *
 * Permissions:
 * - Employee (author): status must be 'pending'
 * - HR: status must be 'pending' or 'approved'
 * - Admin: all statuses except 'accounted'
 */
export async function correctOrder(
  id: string,
  data: IndividualOvertimeOrderType,
  reason: string,
  markAsCancelled?: boolean,
): Promise<{ success: 'corrected' } | { error: string }> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirectToAuth();
  }
  const userEmail = session!.user!.email;
  const userRoles = session!.user!.roles ?? [];
  const isHR = userRoles.includes('hr');
  const isAdmin = userRoles.includes('admin');

  try {
    const coll = await dbc('individual_overtime_orders');

    const order = await coll.findOne({ _id: new ObjectId(id) });
    if (!order) {
      return { error: 'not found' };
    }

    const isAuthor = order.submittedBy === userEmail;

    // Check permissions based on status and role
    if (order.status === 'accounted') {
      return { error: 'cannot correct accounted' };
    }

    if (!isAdmin && !isHR && !isAuthor) {
      return { error: 'unauthorized' };
    }

    if (isAuthor && !isHR && !isAdmin && order.status !== 'pending') {
      return { error: 'unauthorized' };
    }

    if (
      isHR &&
      !isAdmin &&
      !['pending', 'approved'].includes(order.status)
    ) {
      return { error: 'unauthorized' };
    }

    // Build correction history entry with only changed fields
    const changes: any = {};
    if (data.supervisor !== order.supervisor) {
      changes.supervisor = { from: order.supervisor, to: data.supervisor };
    }
    if (data.hours !== order.hours) {
      changes.hours = { from: order.hours, to: data.hours };
    }
    if (data.reason !== order.reason) {
      changes.reason = { from: order.reason, to: data.reason };
    }
    if (data.payment !== order.payment) {
      changes.payment = { from: order.payment, to: data.payment };
    }
    const oldScheduledDayOff = order.scheduledDayOff
      ? new Date(order.scheduledDayOff).getTime()
      : undefined;
    const newScheduledDayOff = data.scheduledDayOff
      ? new Date(data.scheduledDayOff).getTime()
      : undefined;
    if (oldScheduledDayOff !== newScheduledDayOff) {
      changes.scheduledDayOff = {
        from: order.scheduledDayOff,
        to: data.scheduledDayOff,
      };
    }
    if (data.workStartTime && order.workStartTime) {
      if (new Date(data.workStartTime).getTime() !== new Date(order.workStartTime).getTime()) {
        changes.workStartTime = { from: order.workStartTime, to: data.workStartTime };
      }
    }
    if (data.workEndTime && order.workEndTime) {
      if (new Date(data.workEndTime).getTime() !== new Date(order.workEndTime).getTime()) {
        changes.workEndTime = { from: order.workEndTime, to: data.workEndTime };
      }
    }

    const correctionHistoryEntry: any = {
      correctedAt: new Date(),
      correctedBy: userEmail,
      reason: reason,
      changes,
    };

    // Handle cancellation if requested
    let newStatus = order.status;
    if (markAsCancelled) {
      correctionHistoryEntry.statusChanged = {
        from: order.status,
        to: 'cancelled',
      };
      newStatus = 'cancelled';
    }

    // Remove _id from data
    const { _id: _, ...dataWithoutId } = data;

    const update = await coll.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...dataWithoutId,
          status: newStatus,
          editedAt: new Date(),
          editedBy: userEmail,
          ...(markAsCancelled && {
            cancelledAt: new Date(),
            cancelledBy: userEmail,
          }),
        },
        $push: {
          correctionHistory: correctionHistoryEntry,
        },
      } as any,
    );

    if (update.matchedCount === 0) {
      return { error: 'not found' };
    }

    revalidateTag('individual-overtime-orders', { expire: 0 });
    return { success: 'corrected' };
  } catch (error) {
    console.error(error);
    return { error: 'correctOrder server action error' };
  }
}

/**
 * Delete individual overtime order (Admin only)
 * Hard delete from database - available for all statuses
 */
export async function deleteOrder(
  id: string,
): Promise<{ success: 'deleted' } | { error: string }> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirectToAuth();
  }
  const userRoles = session!.user!.roles ?? [];
  const isAdmin = userRoles.includes('admin');

  if (!isAdmin) {
    return { error: 'unauthorized' };
  }

  try {
    const coll = await dbc('individual_overtime_orders');

    const deleteResult = await coll.deleteOne({ _id: new ObjectId(id) });

    if (deleteResult.deletedCount === 0) {
      return { error: 'not found' };
    }

    revalidateTag('individual-overtime-orders', { expire: 0 });
    return { success: 'deleted' };
  } catch (error) {
    console.error(error);
    return { error: 'deleteOrder server action error' };
  }
}

/**
 * Cancel individual overtime order - only before approved
 * Requires a cancellation reason
 */
export async function cancelOrder(
  id: string,
  reason: string,
): Promise<{ success: 'cancelled' } | { error: string }> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirectToAuth();
  }
  const userEmail = session!.user!.email;

  if (!reason || !reason.trim()) {
    return { error: 'reason required' };
  }

  try {
    const coll = await dbc('individual_overtime_orders');

    const order = await coll.findOne({ _id: new ObjectId(id) });
    if (!order) {
      return { error: 'not found' };
    }

    // Can only cancel own orders before approval
    if (order.submittedBy !== userEmail) {
      return { error: 'unauthorized' };
    }

    // Cannot cancel if already approved, accounted, or cancelled
    if (['approved', 'accounted', 'cancelled'].includes(order.status)) {
      return { error: 'cannot cancel' };
    }

    await coll.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledBy: userEmail,
          cancellationReason: reason.trim(),
        },
      },
    );

    revalidateTag('individual-overtime-orders', { expire: 0 });
    return { success: 'cancelled' };
  } catch (error) {
    console.error(error);
    return { error: 'cancelOrder server action error' };
  }
}
