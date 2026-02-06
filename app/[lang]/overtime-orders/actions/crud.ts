'use server';

import { auth } from '@/lib/auth';
import { dbc } from '@/lib/db/mongo';
import { ObjectId } from 'mongodb';
import { redirect } from 'next/navigation';
import { NewOvertimeRequestType } from '../lib/zod';
import { generateNextInternalId, revalidateOvertimeOrders, revalidateOvertimeOrdersRequest } from './utils';
import { revalidateTag } from 'next/cache';

export async function insertOvertimeRequest(
  data: NewOvertimeRequestType,
): Promise<{ success: 'inserted' } | { error: string }> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth?callbackUrl=/overtime-orders');
  }
  try {
    const coll = await dbc('overtime_orders');

    // Generate internal ID
    const internalId = await generateNextInternalId();

    const overtimeRequestToInsert = {
      internalId,
      status: 'pending',
      ...data,
      requestedAt: new Date(),
      requestedBy: session.user.email,
      editedAt: new Date(),
      editedBy: session.user.email,
      pendingAt: new Date(),
      pendingBy: session.user.email,
    };

    const res = await coll.insertOne(overtimeRequestToInsert);
    if (res) {
      revalidateTag('overtime-orders', { expire: 0 });
      return { success: 'inserted' };
    } else {
      return { error: 'not inserted' };
    }
  } catch (error) {
    console.error(error);
    return { error: 'insertOvertimeRequest server action error' };
  }
}

export async function getOvertimeRequestForEdit(id: string) {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth?callbackUrl=/overtime-orders');
  }

  try {
    const coll = await dbc('overtime_orders');
    const request = await coll.findOne({ _id: new ObjectId(id) });

    if (!request) {
      return null;
    }

    // Check if user has permission to edit
    const isAdmin = session.user.roles?.includes('admin');
    const isHR = session.user.roles?.includes('hr');
    const isPlantManager = session.user.roles?.includes('plant-manager');
    const isAuthor = request.requestedBy === session.user.email;

    // For canceled and accounted statuses - only admin can edit
    if (request.status === 'canceled' || request.status === 'accounted') {
      if (!isAdmin) {
        return null;
      }
    } else {
      // For other statuses:
      // Admin, HR, and plant-manager can edit always
      // Author can edit only pending status
      const canEdit =
        isAdmin ||
        isHR ||
        isPlantManager ||
        (isAuthor && request.status === 'pending');

      if (!canEdit) {
        return null;
      }
    }

    // Convert MongoDB document to OvertimeType
    return {
      _id: request._id.toString(),
      internalId: request.internalId,
      status: request.status,
      department: request.department,
      numberOfEmployees: request.numberOfEmployees,
      numberOfShifts: request.numberOfShifts,
      responsibleEmployee: request.responsibleEmployee,
      employeesWithScheduledDayOff: request.employeesWithScheduledDayOff || [],
      from: request.from,
      to: request.to,
      reason: request.reason,
      note: request.note || '',
      plannedArticles: request.plannedArticles || [],
      actualArticles: request.actualArticles,
      actualEmployeesWorked: request.actualEmployeesWorked,
      requestedAt: request.requestedAt,
      requestedBy: request.requestedBy,
      editedAt: request.editedAt,
      editedBy: request.editedBy,
      pendingAt: request.pendingAt,
      pendingBy: request.pendingBy,
      approvedAt: request.approvedAt,
      approvedBy: request.approvedBy,
      canceledAt: request.canceledAt,
      canceledBy: request.canceledBy,
      completedAt: request.completedAt,
      completedBy: request.completedBy,
      accountedAt: request.accountedAt,
      accountedBy: request.accountedBy,
      hasAttachment: request.hasAttachment,
      attachmentFilename: request.attachmentFilename,
    };
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function updateOvertimeRequest(
  id: string,
  data: NewOvertimeRequestType,
): Promise<{ success: 'updated' } | { error: string }> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth?callbackUrl=/overtime-orders');
  }

  try {
    const coll = await dbc('overtime_orders');

    // First check if the request exists and get its current data
    const request = await coll.findOne({ _id: new ObjectId(id) });
    if (!request) {
      return { error: 'not found' };
    }

    // Check if user has permission to edit
    const isAdmin = session.user.roles?.includes('admin');
    const isHR = session.user.roles?.includes('hr');
    const isPlantManager = session.user.roles?.includes('plant-manager');
    const isAuthor = request.requestedBy === session.user.email;

    // For canceled and accounted statuses - only admin can edit
    if (request.status === 'canceled' || request.status === 'accounted') {
      if (!isAdmin) {
        return {
          error:
            'unauthorized - only admin can edit canceled or accounted requests',
        };
      }
    } else {
      // For other statuses:
      // Admin, HR, and plant-manager can edit always
      // Author can edit only pending status
      const canEdit =
        isAdmin ||
        isHR ||
        isPlantManager ||
        (isAuthor && request.status === 'pending');

      if (!canEdit) {
        return { error: 'unauthorized' };
      }
    }

    // Update the request
    // Preserve fields that shouldn't be overwritten
    const update = await coll.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          // Only update user-editable fields from the form
          department: data.department,
          numberOfEmployees: data.numberOfEmployees,
          numberOfShifts: data.numberOfShifts,
          responsibleEmployee: data.responsibleEmployee,
          employeesWithScheduledDayOff: data.employeesWithScheduledDayOff,
          from: data.from,
          to: data.to,
          reason: data.reason,
          note: data.note,
          plannedArticles: data.plannedArticles,
          // Update metadata
          editedAt: new Date(),
          editedBy: session.user.email,
        },
      },
    );

    if (update.matchedCount === 0) {
      return { error: 'not found' };
    }

    revalidateOvertimeOrders();
    revalidateOvertimeOrdersRequest();
    return { success: 'updated' };
  } catch (error) {
    console.error(error);
    return { error: 'updateOvertimeRequest server action error' };
  }
}
