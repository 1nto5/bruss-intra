'use server';

import { auth } from '@/lib/auth';
import { dbc } from '@/lib/db/mongo';
import { ObjectId } from 'mongodb';
import { revalidateTag } from 'next/cache';
import {
  revalidateOvertime,
  sendRejectionEmailToEmployee,
  sendApprovalEmailToEmployee,
} from './utils';
import { redirectToAuth } from '@/app/[lang]/actions';
import type { CorrectionHistoryEntry } from '../lib/types';

/**
 * Approve overtime submission
 * Supports dual-stage approval for overtime requests:
 * - Stage 1: Supervisor approval (pending → pending-plant-manager)
 * - Stage 2: Plant Manager approval (pending-plant-manager → approved)
 * Regular submissions: pending → approved
 */
export async function approveOvertimeSubmission(id: string) {
  console.log('approveOvertimeSubmission', id);
  const session = await auth();
  if (!session || !session.user?.email) {
    redirectToAuth();
  }
  // TypeScript narrowing: session is guaranteed to be non-null after redirectToAuth()
  const userEmail = session!.user!.email;

  // Check if user has HR or admin role for emergency override
  const userRoles = session!.user!.roles ?? [];
  const isHR = userRoles.includes('hr');
  const isAdmin = userRoles.includes('admin');
  const isPlantManager = userRoles.includes('plant-manager');

  try {
    const coll = await dbc('overtime_submissions');

    // First check if this submission exists
    const submission = await coll.findOne({ _id: new ObjectId(id) });
    if (!submission) {
      return { error: 'not found' };
    }

    // Dual approval logic for payout requests only (pickup-only = single-stage)
    if (submission.overtimeRequest && submission.payment) {
      if (submission.status === 'pending') {
        // Supervisor approval: move to pending-plant-manager OR directly to approved
        if (
          submission.supervisor !== userEmail &&
          !isHR &&
          !isAdmin
        ) {
          return { error: 'unauthorized' };
        }

        // If supervisor is also a plant manager, complete approval in one step
        if (isPlantManager || isAdmin) {
          const update = await coll.updateOne(
            { _id: new ObjectId(id) },
            {
              $set: {
                status: 'approved',
                supervisorApprovedAt: new Date(),
                supervisorApprovedBy: userEmail,
                plantManagerApprovedAt: new Date(),
                plantManagerApprovedBy: userEmail,
                approvedAt: new Date(),
                approvedBy: userEmail,
                editedAt: new Date(),
                editedBy: userEmail,
              },
            },
          );
          if (update.matchedCount === 0) {
            return { error: 'not found' };
          }
          revalidateTag('overtime', { expire: 0 });
          await sendApprovalEmailToEmployee(submission.submittedBy, id, 'final');
          return { success: 'approved' };
        }

        // Otherwise, move to pending-plant-manager for second approval
        const update = await coll.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              status: 'pending-plant-manager',
              supervisorApprovedAt: new Date(),
              supervisorApprovedBy: userEmail,
              editedAt: new Date(),
              editedBy: userEmail,
            },
          },
        );
        if (update.matchedCount === 0) {
          return { error: 'not found' };
        }
        revalidateTag('overtime', { expire: 0 });
        await sendApprovalEmailToEmployee(submission.submittedBy, id, 'supervisor');
        return { success: 'supervisor-approved' };
      } else if (submission.status === 'pending-plant-manager') {
        // Only plant manager can approve
        if (!isPlantManager && !isAdmin) {
          return { error: 'unauthorized' };
        }
        const update = await coll.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              status: 'approved',
              plantManagerApprovedAt: new Date(),
              plantManagerApprovedBy: userEmail,
              approvedAt: new Date(),
              approvedBy: userEmail,
              editedAt: new Date(),
              editedBy: userEmail,
            },
          },
        );
        if (update.matchedCount === 0) {
          return { error: 'not found' };
        }
        revalidateTag('overtime', { expire: 0 });
        await sendApprovalEmailToEmployee(submission.submittedBy, id, 'final');
        return { success: 'plant-manager-approved' };
      } else {
        return { error: 'invalid status' };
      }
    }
    // Non-payment or fallback to old logic
    // Allow approval if:
    // 1. User is the assigned supervisor, OR
    // 2. User has HR role, OR
    // 3. User has admin role
    if (submission.supervisor !== userEmail && !isHR && !isAdmin) {
      return {
        error: 'unauthorized',
      };
    }
    const update = await coll.updateOne(
      { _id: new ObjectId(id) },
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
    if (update.matchedCount === 0) {
      return { error: 'not found' };
    }
        revalidateTag('overtime', { expire: 0 });
    await sendApprovalEmailToEmployee(submission.submittedBy, id, 'final');
    return { success: 'approved' };
  } catch (error) {
    console.error(error);
    return { error: 'approveOvertimeSubmission server action error' };
  }
}

/**
 * Reject overtime submission
 * Sends rejection email notification to submitter
 */
export async function rejectOvertimeSubmission(
  id: string,
  rejectionReason: string,
) {
  console.log('rejectOvertimeSubmission', id);
  const session = await auth();
  if (!session || !session.user?.email) {
    redirectToAuth();
  }
  const userEmail = session!.user!.email;

  // Check if user has HR or admin role for emergency override
  const userRoles = session!.user!.roles ?? [];
  const isHR = userRoles.includes('hr');
  const isAdmin = userRoles.includes('admin');

  try {
    const coll = await dbc('overtime_submissions');

    // First check if this submission exists
    const submission = await coll.findOne({ _id: new ObjectId(id) });
    if (!submission) {
      return { error: 'not found' };
    }

    // Allow rejection if:
    // 1. User is the assigned supervisor, OR
    // 2. User has HR role, OR
    // 3. User has admin role
    if (submission.supervisor !== userEmail && !isHR && !isAdmin) {
      return {
        error: 'unauthorized',
      };
    }

    const update = await coll.updateOne(
      { _id: new ObjectId(id) },
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
    if (update.matchedCount === 0) {
      return { error: 'not found' };
    }
    revalidateOvertime();
    await sendRejectionEmailToEmployee(
      submission.submittedBy,
      id,
      rejectionReason,
    );
    return { success: 'rejected' };
  } catch (error) {
    console.error(error);
    return { error: 'rejectOvertimeSubmission server action error' };
  }
}

/**
 * Mark overtime submission as accounted (settled)
 * Only HR and Admin can perform this action
 */
export async function markAsAccountedOvertimeSubmission(id: string) {
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
    const update = await coll.updateOne(
      { _id: new ObjectId(id) },
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
    if (update.matchedCount === 0) {
      return { error: 'not found' };
    }
    revalidateOvertime();
    return { success: 'accounted' };
  } catch (error) {
    console.error(error);
    return { error: 'markAsAccountedOvertimeSubmission server action error' };
  }
}

/**
 * Convert overtime submission to payout
 * Only Plant Manager and Admin can perform this action
 * Used for month-end settlement when user didn't take day off
 */
export async function convertToPayoutOvertimeSubmission(id: string) {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirectToAuth();
  }
  const userEmail = session!.user!.email;

  const isPlantManager = (session!.user!.roles ?? []).includes('plant-manager');
  const isAdmin = (session!.user!.roles ?? []).includes('admin');

  if (!isPlantManager && !isAdmin) {
    return { error: 'unauthorized' };
  }

  try {
    const coll = await dbc('overtime_submissions');

    const submission = await coll.findOne({ _id: new ObjectId(id) });
    if (!submission) {
      return { error: 'not found' };
    }

    // Only approved entries without payment/scheduledDayOff can be converted
    if (submission.status !== 'approved') {
      return { error: 'invalid status' };
    }
    if (submission.payment) {
      return { error: 'already payout' };
    }
    if (submission.scheduledDayOff) {
      return { error: 'has scheduled day off' };
    }

    const update = await coll.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          payment: true,
          payoutConvertedAt: new Date(),
          payoutConvertedBy: userEmail,
          editedAt: new Date(),
          editedBy: userEmail,
        },
      },
    );
    if (update.matchedCount === 0) {
      return { error: 'not found' };
    }
    revalidateOvertime();
    return { success: 'converted' };
  } catch (error) {
    console.error(error);
    return { error: 'convertToPayoutOvertimeSubmission server action error' };
  }
}

/**
 * Supervisor sets scheduled day off for pending-plant-manager submissions
 * Converts payout request to time-off and changes status to approved
 * Records change in correction history with mandatory reason
 */
export async function supervisorSetScheduledDayOff(
  id: string,
  scheduledDayOff: Date,
  reason: string,
): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirectToAuth();
  }
  const userEmail = session!.user!.email as string;

  // Validate reason is not empty
  if (!reason || !reason.trim()) {
    return { error: 'reason required' };
  }

  // Validate scheduledDayOff is a valid date
  if (!scheduledDayOff || isNaN(new Date(scheduledDayOff).getTime())) {
    return { error: 'invalid date' };
  }

  try {
    const coll = await dbc('overtime_submissions');

    const submission = await coll.findOne({ _id: new ObjectId(id) });
    if (!submission) {
      return { error: 'not found' };
    }

    // Permission: only the assigned supervisor can perform this action
    if (submission.supervisor !== userEmail) {
      return { error: 'unauthorized' };
    }

    // Status: must be pending-plant-manager
    if (submission.status !== 'pending-plant-manager') {
      return { error: 'invalid status' };
    }

    // Build correction history entry
    const correctionEntry: CorrectionHistoryEntry = {
      correctedAt: new Date(),
      correctedBy: userEmail,
      reason: reason.trim(),
      statusChanged: {
        from: 'pending-plant-manager',
        to: 'approved',
      },
      changes: {
        payment: { from: true, to: false },
        scheduledDayOff: { from: undefined, to: new Date(scheduledDayOff) },
      },
    };

    const update = await coll.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          scheduledDayOff: new Date(scheduledDayOff),
          payment: false,
          status: 'approved',
          approvedAt: new Date(),
          approvedBy: userEmail,
          editedAt: new Date(),
          editedBy: userEmail,
        },
        $push: {
          correctionHistory: correctionEntry,
        },
      } as any,
    );

    if (update.matchedCount === 0) {
      return { error: 'not found' };
    }

    revalidateOvertime();
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: 'supervisorSetScheduledDayOff server action error' };
  }
}
