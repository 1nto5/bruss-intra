'use server';

import { redirectToAuth } from '@/app/[lang]/actions';
import { auth } from '@/lib/auth';
import { dbc } from '@/lib/db/mongo';
import { ObjectId } from 'mongodb';
import {
  revalidateOvertime,
  sendApprovalEmailToEmployee,
  sendRejectionEmailToEmployee,
} from './utils';

/**
 * Bulk approve overtime submissions
 * Single-stage approval: pending → approved
 */
export async function bulkApproveOvertimeSubmissions(ids: string[]) {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirectToAuth();
  }
  const userEmail = session!.user!.email;

  const userRoles = session!.user!.roles ?? [];
  const isHR = userRoles.includes('hr');
  const isAdmin = userRoles.includes('admin');

  try {
    const coll = await dbc('overtime_submissions');
    const objectIds = ids.map((id) => new ObjectId(id));

    // First, check permissions for each submission
    const submissions = await coll.find({ _id: { $in: objectIds } }).toArray();

    // Filter submissions that can be approved
    const allowedSubmissions = submissions.filter((submission) => {
      return (
        submission.status === 'pending' &&
        (submission.supervisor === userEmail || isHR || isAdmin)
      );
    });

    if (allowedSubmissions.length === 0) {
      return { error: 'no valid submissions' };
    }

    const allowedIds = allowedSubmissions.map((submission) => submission._id);

    const result = await coll.updateMany(
      { _id: { $in: allowedIds } },
      {
        $set: {
          status: 'approved',
          approvedAt: new Date(),
          approvedBy: userEmail,
          editedAt: new Date(),
          editedBy: userEmail,
        },
      },
    );

    // Send approval emails
    for (const submission of allowedSubmissions) {
      await sendApprovalEmailToEmployee(
        submission.submittedBy,
        submission._id.toString(),
        'final',
        submission.hours,
        submission.date,
      );
    }

    revalidateOvertime();
    return {
      success: 'approved',
      count: result.modifiedCount,
      total: ids.length,
    };
  } catch (error) {
    console.error(error);
    return { error: 'bulkApproveOvertimeSubmissions server action error' };
  }
}

/**
 * Bulk reject overtime submissions
 * Sends rejection email to each affected employee
 */
export async function bulkRejectOvertimeSubmissions(
  ids: string[],
  rejectionReason: string,
) {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirectToAuth();
  }
  const userEmail = session!.user!.email;

  const userRoles = session!.user!.roles ?? [];
  const isHR = userRoles.includes('hr');
  const isAdmin = userRoles.includes('admin');

  try {
    const coll = await dbc('overtime_submissions');
    const objectIds = ids.map((id) => new ObjectId(id));

    // First, check permissions for each submission
    const submissions = await coll.find({ _id: { $in: objectIds } }).toArray();

    const allowedSubmissions = submissions.filter((submission) => {
      // Allow rejection if user is supervisor, HR, or admin
      return (
        (submission.supervisor === userEmail || isHR || isAdmin) &&
        submission.status === 'pending'
      );
    });

    if (allowedSubmissions.length === 0) {
      return { error: 'no valid submissions' };
    }

    const allowedIds = allowedSubmissions.map((submission) => submission._id);

    const updateResult = await coll.updateMany(
      { _id: { $in: allowedIds } },
      {
        $set: {
          status: 'rejected',
          rejectedAt: new Date(),
          rejectedBy: userEmail,
          rejectionReason: rejectionReason,
          editedAt: new Date(),
          editedBy: userEmail,
        },
      },
    );

    // Send rejection emails
    for (const submission of allowedSubmissions) {
      await sendRejectionEmailToEmployee(
        submission.submittedBy,
        submission._id.toString(),
        rejectionReason,
        submission.hours,
        submission.date,
      );
    }

    revalidateOvertime();
    return {
      success: 'rejected',
      count: updateResult.modifiedCount,
      total: ids.length,
    };
  } catch (error) {
    console.error(error);
    return { error: 'bulkRejectOvertimeSubmissions server action error' };
  }
}

/**
 * Bulk mark overtime submissions as accounted (settled)
 * Only HR and Admin can perform this action
 * Only approved submissions can be marked as accounted
 */
export async function bulkMarkAsAccountedOvertimeSubmissions(ids: string[]) {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirectToAuth();
  }
  const userEmail = session!.user!.email;

  const isHR = (session!.user!.roles ?? []).includes('hr');
  const isAdmin = (session!.user!.roles ?? []).includes('admin');

  if (!isHR && !isAdmin) {
    return { error: 'unauthorized' };
  }

  try {
    const coll = await dbc('overtime_submissions');
    const objectIds = ids.map((id) => new ObjectId(id));

    const updateResult = await coll.updateMany(
      {
        _id: { $in: objectIds },
        status: 'approved', // Only approved submissions can be marked as accounted
      },
      {
        $set: {
          status: 'accounted',
          accountedAt: new Date(),
          accountedBy: userEmail,
          editedAt: new Date(),
          editedBy: userEmail,
        },
      },
    );

    revalidateOvertime();
    return {
      success: 'accounted',
      count: updateResult.modifiedCount,
      total: ids.length,
    };
  } catch (error) {
    console.error(error);
    return {
      error: 'bulkMarkAsAccountedOvertimeSubmissions server action error',
    };
  }
}

/**
 * Bulk cancel overtime requests
 * Only submitter can cancel their own pending submissions
 */
export async function bulkCancelOvertimeRequests(ids: string[]) {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirectToAuth();
  }
  const userEmail = session!.user!.email;

  try {
    const coll = await dbc('overtime_submissions');
    const objectIds = ids.map((id) => new ObjectId(id));

    // Only allow cancellation of own pending submissions
    const updateResult = await coll.updateMany(
      {
        _id: { $in: objectIds },
        submittedBy: userEmail,
        status: 'pending',
      },
      {
        $set: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledBy: userEmail,
          editedAt: new Date(),
          editedBy: userEmail,
        },
      },
    );

    revalidateOvertime();
    return {
      success: 'cancelled',
      count: updateResult.modifiedCount,
      total: ids.length,
    };
  } catch (error) {
    console.error(error);
    return { error: 'bulkCancelOvertimeRequests server action error' };
  }
}
