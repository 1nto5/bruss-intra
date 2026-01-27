'use server';

import { auth } from '@/lib/auth';
import { dbc } from '@/lib/db/mongo';
import { overtimeOrderApprovalNotification } from '@/lib/services/email-templates';
import mailer from '@/lib/services/mailer';
import { resolveDisplayName } from '@/lib/utils/name-resolver';
import { ObjectId } from 'mongodb';
import { revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { overtimeRequestEmployeeType } from './lib/types';
import { NewOvertimeRequestType } from './lib/zod';

export async function revalidateProductionOvertime() {
  revalidateTag('production-overtime', { expire: 0 });
}

export async function revalidateProductionOvertimeRequest() {
  revalidateTag('production-overtime-request', { expire: 0 });
}

export async function redirectToProductionOvertime(lang: string) {
  redirect(`/${lang}/production-overtime`);
}

export async function redirectToProductionOvertimeDaysOff(
  id: string,
  lang: string,
) {
  redirect(`/${lang}/production-overtime/${id}`);
}

async function sendEmailNotificationToRequestor(
  email: string,
  id: string,
  approverName: string,
  orderData?: {
    workStartTime?: Date | null;
    workEndTime?: Date | null;
    hours?: number;
    payment?: boolean;
    scheduledDayOff?: Date | null;
  },
) {
  const { subject, html } = overtimeOrderApprovalNotification({
    requestUrl: `${process.env.BASE_URL}/production-overtime/${id}`,
    approverName,
    workStartTime: orderData?.workStartTime,
    workEndTime: orderData?.workEndTime,
    hours: orderData?.hours,
    payment: orderData?.payment,
    scheduledDayOff: orderData?.scheduledDayOff,
  });
  await mailer({ to: email, subject, html });
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

export async function insertOvertimeRequest(
  data: NewOvertimeRequestType,
): Promise<{ success: 'inserted' } | { error: string }> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth');
  }
  try {
    const coll = await dbc('production_overtime');

    const overtimeRequestToInsert = {
      status: 'pending',
      ...data,
      requestedAt: new Date(),
      requestedBy: session.user.email,
      editedAt: new Date(),
      editedBy: session.user.email,
    };

    const res = await coll.insertOne(overtimeRequestToInsert);
    if (res) {
      revalidateTag('production-overtime', { expire: 0 });
      return { success: 'inserted' };
    } else {
      return { error: 'not inserted' };
    }
  } catch (error) {
    console.error(error);
    return { error: 'insertOvertimeRequest server action error' };
  }
}

export async function deleteDayOff(
  overtimeId: string,
  employeeIdentifier: string,
) {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth');
  }
  try {
    const coll = await dbc('production_overtime');

    // Check if the user is authorized to modify this request
    const request = await coll.findOne({ _id: new ObjectId(overtimeId) });
    if (!request) {
      return { error: 'not found' };
    }

    // Check if status allows modifications
    if (request.status === 'completed' || request.status === 'rejected') {
      return { error: 'invalid status' };
    }

    if (
      request.requestedBy !== session.user.email &&
      !session.user.roles?.includes('admin') &&
      !session.user.roles?.includes('production-manager') &&
      !session.user.roles?.includes('group-leader') &&
      !session.user.roles?.includes('plant-manager') &&
      !session.user.roles?.includes('hr')
    ) {
      return { error: 'unauthorized' };
    }

    // Use $pull to remove the employee with specified identifier from the employeesWithScheduledDayOff array
    const update = await coll.updateOne(
      { _id: new ObjectId(overtimeId) },
      {
        $pull: {
          employeesWithScheduledDayOff: { identifier: employeeIdentifier },
        },
        $set: {
          editedAt: new Date(),
          editedBy: session.user.email,
        },
      } as any,
    );

    if (update.matchedCount === 0) {
      return { error: 'not found' };
    }

    if (update.modifiedCount === 0) {
      return { error: 'not found employee' };
    }

    revalidateProductionOvertime();
    revalidateProductionOvertimeRequest();
    return { success: 'deleted' };
  } catch (error) {
    console.error(error);
    return { error: 'deleteTimeOffRequest server action error' };
  }
}

// Keep deleteEmployee for backward compatibility but make it call the new function
export async function deleteEmployee(
  overtimeId: string,
  employeeIndex: number,
) {
  // This is a temporary compatibility function
  // Get the identifier from the document and delegate to deleteTimeOffRequest
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth');
  }
  try {
    const coll = await dbc('production_overtime');
    const request = await coll.findOne({ _id: new ObjectId(overtimeId) });
    if (!request) {
      return { error: 'not found' };
    }

    // Get employee at the specified index
    const employee = request.employeesWithScheduledDayOff[employeeIndex];
    if (!employee) {
      return { error: 'not found employee' };
    }

    // Call the new function with the identifier
    return await deleteDayOff(overtimeId, employee.identifier);
  } catch (error) {
    console.error(error);
    return { error: 'deleteEmployee server action error' };
  }
}

export async function addEmployeeDayOff(
  overtimeId: string,
  newEmployee: overtimeRequestEmployeeType,
) {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth');
  }
  try {
    const coll = await dbc('production_overtime');

    // Check if the user is authorized to modify this request
    const request = await coll.findOne({ _id: new ObjectId(overtimeId) });
    if (!request) {
      return { error: 'not found' };
    }

    if (
      request.requestedBy !== session.user.email &&
      !session.user.roles?.includes('admin') &&
      !session.user.roles?.includes('production-manager') &&
      !session.user.roles?.includes('group-leader') &&
      !session.user.roles?.includes('plant-manager') &&
      !session.user.roles?.includes('hr')
    ) {
      return { error: 'unauthorized' };
    }

    // Check if an employee with the same identifier already exists in the employeesWithScheduledDayOff array
    const employeeExists = request.employeesWithScheduledDayOff?.some(
      (employee: overtimeRequestEmployeeType) =>
        employee.identifier === newEmployee.identifier,
    );

    if (employeeExists) {
      return { error: 'employee already exists' };
    }

    // Check if the number of employees with scheduled days off doesn't exceed the total number
    const employeesWithDaysOffCount =
      request.employeesWithScheduledDayOff?.length || 0;

    // Check if adding another employee would exceed the total number of employees
    if (employeesWithDaysOffCount + 1 > request.numberOfEmployees) {
      return { error: 'too many employees with scheduled days off' };
    }

    // Add the new employee to the employeesWithScheduledDayOff array
    const update = await coll.updateOne(
      { _id: new ObjectId(overtimeId) },
      {
        $push: {
          employeesWithScheduledDayOff: newEmployee,
        },
        $set: {
          editedAt: new Date(),
          editedBy: session.user.email,
        },
      } as any,
    );

    if (update.matchedCount === 0) {
      return { error: 'not found' };
    }

    revalidateProductionOvertime();
    revalidateProductionOvertimeRequest();
    return { success: 'added' };
  } catch (error) {
    console.error(error);
    return { error: 'addEmployeeDayOff server action error' };
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

// Bulk Actions
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

export async function getOvertimeRequestForEdit(id: string) {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth');
  }

  try {
    const coll = await dbc('production_overtime');
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
      status: request.status,
      numberOfEmployees: request.numberOfEmployees,
      numberOfShifts: request.numberOfShifts,
      responsibleEmployee: request.responsibleEmployee,
      employeesWithScheduledDayOff: request.employeesWithScheduledDayOff || [],
      from: request.from,
      to: request.to,
      reason: request.reason,
      note: request.note || '',
      requestedAt: request.requestedAt,
      requestedBy: request.requestedBy,
      editedAt: request.editedAt,
      editedBy: request.editedBy,
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
    redirect('/auth');
  }

  try {
    const coll = await dbc('production_overtime');

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
    const update = await coll.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...data,
          editedAt: new Date(),
          editedBy: session.user.email,
        },
      },
    );

    if (update.matchedCount === 0) {
      return { error: 'not found' };
    }

    revalidateProductionOvertime();
    revalidateProductionOvertimeRequest();
    return { success: 'updated' };
  } catch (error) {
    console.error(error);
    return { error: 'updateOvertimeRequest server action error' };
  }
}
