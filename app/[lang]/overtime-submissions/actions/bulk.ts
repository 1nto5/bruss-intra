'use server';

import { auth } from '@/lib/auth';
import { dbc } from '@/lib/db/mongo';
import { ObjectId } from 'mongodb';
import { redirect } from 'next/navigation';
import {
  revalidateOvertime,
  sendApprovalEmailToEmployee,
  sendRejectionEmailToEmployee,
} from './utils';

/**
 * Bulk approve overtime submissions
 * For non-payout submissions: pending → approved (single stage)
 * For payout submissions: uses single item approval (dual-stage) - excluded from bulk
 * Plant managers can also approve pending-plant-manager payout requests in bulk
 */
export async function bulkApproveOvertimeSubmissions(ids: string[]) {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth?callbackUrl=/overtime-submissions');
  }
  const userEmail = session!.user!.email;

  const userRoles = session!.user!.roles ?? [];
  const isHR = userRoles.includes('hr');
  const isAdmin = userRoles.includes('admin');
  const isPlantManager = userRoles.includes('plant-manager');

  try {
    const coll = await dbc('overtime_submissions');
    const objectIds = ids.map((id) => new ObjectId(id));

    // First, check permissions for each submission
    const submissions = await coll.find({ _id: { $in: objectIds } }).toArray();

    // Filter submissions that can be approved
    const allowedSubmissions = submissions.filter((submission) => {
      // For non-payout pending submissions - supervisor/HR/admin can approve
      if (
        submission.status === 'pending' &&
        !submission.payoutRequest &&
        (submission.supervisor === userEmail || isHR || isAdmin)
      ) {
        return true;
      }
      // For pending-plant-manager payout requests - only plant manager/admin can approve
      if (
        submission.status === 'pending-plant-manager' &&
        submission.payoutRequest &&
        (isPlantManager || isAdmin)
      ) {
        return true;
      }
      return false;
    });

    if (allowedSubmissions.length === 0) {
      return { error: 'no valid submissions' };
    }

    // Separate into two groups: regular approvals and plant manager approvals
    const regularApprovals = allowedSubmissions.filter(
      (s) => s.status === 'pending',
    );
    const plantManagerApprovals = allowedSubmissions.filter(
      (s) => s.status === 'pending-plant-manager',
    );

    let totalModified = 0;

    // Process regular approvals
    if (regularApprovals.length > 0) {
      const regularIds = regularApprovals.map((s) => s._id);
      const result = await coll.updateMany(
        { _id: { $in: regularIds } },
        {
          $set: {
            status: 'approved',
            approvedAt: new Date(),
            approvedBy: userEmail,
          },
        },
      );
      totalModified += result.modifiedCount;

      // Send approval emails for regular approvals
      for (const submission of regularApprovals) {
        if (!submission.submittedByIdentifier) {
          await sendApprovalEmailToEmployee(
            submission.submittedBy,
            submission._id.toString(),
            'final',
            submission.hours,
            submission.date,
          );
        }
      }
    }

    // Process plant manager approvals
    if (plantManagerApprovals.length > 0) {
      const pmIds = plantManagerApprovals.map((s) => s._id);
      const result = await coll.updateMany(
        { _id: { $in: pmIds } },
        {
          $set: {
            status: 'approved',
            plantManagerApprovedAt: new Date(),
            plantManagerApprovedBy: userEmail,
            approvedAt: new Date(),
            approvedBy: userEmail,
          },
        },
      );
      totalModified += result.modifiedCount;

      // Send approval emails for plant manager approvals
      for (const submission of plantManagerApprovals) {
        if (!submission.submittedByIdentifier) {
          await sendApprovalEmailToEmployee(
            submission.submittedBy,
            submission._id.toString(),
            'final',
            submission.hours,
            submission.date,
          );
        }
      }
    }

    revalidateOvertime();
    return {
      success: 'approved',
      count: totalModified,
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
 * Can reject from either 'pending' or 'pending-plant-manager' status
 */
export async function bulkRejectOvertimeSubmissions(
  ids: string[],
  rejectionReason: string,
) {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth?callbackUrl=/overtime-submissions');
  }
  const userEmail = session!.user!.email;

  const userRoles = session!.user!.roles ?? [];
  const isHR = userRoles.includes('hr');
  const isAdmin = userRoles.includes('admin');
  const isPlantManager = userRoles.includes('plant-manager');

  try {
    const coll = await dbc('overtime_submissions');
    const objectIds = ids.map((id) => new ObjectId(id));

    // First, check permissions for each submission
    const submissions = await coll.find({ _id: { $in: objectIds } }).toArray();

    const allowedSubmissions = submissions.filter((submission) => {
      // For pending submissions - supervisor/HR/admin can reject
      if (
        submission.status === 'pending' &&
        (submission.supervisor === userEmail || isHR || isAdmin)
      ) {
        return true;
      }
      // For pending-plant-manager - only plant manager/admin can reject
      if (
        submission.status === 'pending-plant-manager' &&
        (isPlantManager || isAdmin)
      ) {
        return true;
      }
      return false;
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
        },
      },
    );

    // Send rejection emails
    for (const submission of allowedSubmissions) {
      if (!submission.submittedByIdentifier) {
        await sendRejectionEmailToEmployee(
          submission.submittedBy,
          submission._id.toString(),
          rejectionReason,
          submission.hours,
          submission.date,
        );
      }
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
    redirect('/auth?callbackUrl=/overtime-submissions');
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
 * Only submitter can cancel their own pending or pending-plant-manager submissions
 */
export async function bulkCancelOvertimeRequests(ids: string[]) {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth?callbackUrl=/overtime-submissions');
  }
  const userEmail = session!.user!.email;

  try {
    const coll = await dbc('overtime_submissions');
    const objectIds = ids.map((id) => new ObjectId(id));

    // Only allow cancellation of own pending or pending-plant-manager submissions
    const updateResult = await coll.updateMany(
      {
        _id: { $in: objectIds },
        submittedBy: userEmail,
        status: { $in: ['pending', 'pending-plant-manager'] },
      },
      {
        $set: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledBy: userEmail,
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
