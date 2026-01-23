'use server';

import { redirectToAuth } from '@/app/[lang]/actions';
import { auth } from '@/lib/auth';
import { dbc } from '@/lib/db/mongo';
import { ObjectId } from 'mongodb';
import { revalidateTag } from 'next/cache';
import { OvertimeSubmissionType } from '../lib/types';
import { generateNextInternalId, sendCorrectionEmailToEmployee } from './utils';

/**
 * Insert new overtime submission
 * Available to all authenticated users
 */
export async function insertOvertimeSubmission(
  data: OvertimeSubmissionType,
): Promise<{ success: 'inserted' } | { error: string }> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirectToAuth();
  }
  // TypeScript narrowing: session is guaranteed to be non-null after redirectToAuth()
  const userEmail = session!.user!.email as string;

  try {
    const coll = await dbc('overtime_submissions');

    const internalId = await generateNextInternalId();

    if (!data.date) {
      throw new Error('Date is required');
    }

    // Exclude _id from insert (MongoDB will generate it)
    const { _id, ...dataWithoutId } = data;

    const overtimeSubmissionToInsert = {
      internalId,
      ...dataWithoutId,
      status: 'pending', // Always set to pending for new submissions
      submittedAt: new Date(),
      submittedBy: userEmail,
      ...(session!.user!.identifier && {
        submittedByIdentifier: session!.user!.identifier,
      }),
      editedAt: new Date(),
      editedBy: userEmail,
    };

    const res = await coll.insertOne(overtimeSubmissionToInsert);
    if (res) {
      revalidateTag('overtime', { expire: 0 });
      return { success: 'inserted' };
    } else {
      return { error: 'not inserted' };
    }
  } catch (error) {
    console.error(error);
    return { error: 'insertOvertimeSubmission server action error' };
  }
}

/**
 * Update overtime submission (employee self-edit)
 * Only submitter can edit, only when status is 'pending'
 */
export async function updateOvertimeSubmission(
  id: string,
  data: OvertimeSubmissionType,
): Promise<{ success: 'updated' } | { error: string }> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirectToAuth();
  }
  // TypeScript narrowing: session is guaranteed to be non-null after redirectToAuth()
  const userEmail = session!.user!.email;

  try {
    const coll = await dbc('overtime_submissions');

    // First check if the submission exists and user can edit it
    const submission = await coll.findOne({ _id: new ObjectId(id) });
    if (!submission) {
      return { error: 'not found' };
    }

    // Only the submitter can edit their own submission, and only if it's pending
    if (submission.submittedBy !== userEmail) {
      return { error: 'unauthorized' };
    }

    if (submission.status !== 'pending') {
      return { error: 'invalid status' };
    }

    if (!data.date) {
      throw new Error('Date is required');
    }

    // Build edit history entry with only changed fields
    const changes: any = {};
    if (data.supervisor !== submission.supervisor) {
      changes.supervisor = {
        from: submission.supervisor,
        to: data.supervisor,
      };
    }
    if (
      data.date &&
      new Date(data.date).getTime() !==
        new Date(submission.date).getTime()
    ) {
      changes.date = { from: submission.date, to: data.date };
    }
    if (data.hours !== submission.hours) {
      changes.hours = { from: submission.hours, to: data.hours };
    }
    if (data.reason !== submission.reason) {
      changes.reason = { from: submission.reason, to: data.reason };
    }

    const editHistoryEntry = {
      editedAt: new Date(),
      editedBy: userEmail,
      changes,
    };

    // Remove _id from data to avoid MongoDB immutable field error
    const { _id: _, ...dataWithoutId } = data;

    const update = await coll.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...dataWithoutId,
          editedAt: new Date(),
          editedBy: userEmail,
        },
        $push: {
          editHistory: editHistoryEntry,
        },
      } as any,
    );

    if (update.matchedCount === 0) {
      return { error: 'not found' };
    }

    revalidateTag('overtime', { expire: 0 });
    return { success: 'updated' };
  } catch (error) {
    console.error(error);
    return { error: 'updateOvertimeSubmission server action error' };
  }
}

/**
 * Edit overtime submission (HR/Admin)
 * HR/Admin can edit in any status, resets to 'pending' for re-approval
 */
export async function editOvertimeSubmission(
  id: string,
  data: OvertimeSubmissionType,
): Promise<{ success: 'updated' } | { error: string }> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirectToAuth();
  }
  // TypeScript narrowing: session is guaranteed to be non-null after redirectToAuth()
  const userEmail = session!.user!.email;

  // Only HR or admin can use this function
  const userRoles = session!.user!.roles ?? [];
  const isHR = userRoles.includes('hr');
  const isAdmin = userRoles.includes('admin');

  if (!isHR && !isAdmin) {
    return { error: 'unauthorized' };
  }

  try {
    const coll = await dbc('overtime_submissions');

    // Check if the submission exists
    const submission = await coll.findOne({ _id: new ObjectId(id) });
    if (!submission) {
      return { error: 'not found' };
    }

    if (!data.date) {
      throw new Error('Date is required');
    }

    // HR/Admin can edit submissions in any status

    // Build edit history entry with only changed fields
    const changes: any = {};
    if (data.supervisor !== submission.supervisor) {
      changes.supervisor = {
        from: submission.supervisor,
        to: data.supervisor,
      };
    }
    if (
      data.date &&
      new Date(data.date).getTime() !==
        new Date(submission.date).getTime()
    ) {
      changes.date = { from: submission.date, to: data.date };
    }
    if (data.hours !== submission.hours) {
      changes.hours = { from: submission.hours, to: data.hours };
    }
    if (data.reason !== submission.reason) {
      changes.reason = { from: submission.reason, to: data.reason };
    }
    // Track status change to pending
    if (submission.status !== 'pending') {
      changes.status = { from: submission.status, to: 'pending' };
    }

    const editHistoryEntry = {
      editedAt: new Date(),
      editedBy: userEmail,
      changes,
    };

    // Remove _id from data to avoid MongoDB immutable field error
    const { _id: _, ...dataWithoutId } = data;

    // Update submission and reset status to pending for re-approval
    const update = await coll.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...dataWithoutId,
          status: 'pending',
          editedAt: new Date(),
          editedBy: userEmail,
        },
        $unset: {
          approvedAt: '',
          approvedBy: '',
          rejectedAt: '',
          rejectedBy: '',
          rejectionReason: '',
        },
        $push: {
          editHistory: editHistoryEntry,
        },
      } as any,
    );

    if (update.matchedCount === 0) {
      return { error: 'not found' };
    }

    revalidateTag('overtime', { expire: 0 });
    return { success: 'updated' };
  } catch (error) {
    console.error(error);
    return { error: 'editOvertimeSubmission server action error' };
  }
}

/**
 * Unified correction action for overtime submissions
 * Replaces updateOvertimeSubmission and editOvertimeSubmission
 *
 * Permissions:
 * - Employee (author): status must be 'pending'
 * - HR: status must be 'pending' or 'approved'
 * - Admin: all statuses except 'accounted'
 */
export async function correctOvertimeSubmission(
  id: string,
  data: OvertimeSubmissionType,
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
  const isPlantManager = userRoles.includes('plant_manager');

  try {
    const coll = await dbc('overtime_submissions');

    // Check if the submission exists
    const submission = await coll.findOne({ _id: new ObjectId(id) });
    if (!submission) {
      return { error: 'not found' };
    }

    const isAuthor = submission.submittedBy === userEmail;
    const isSupervisor = submission.supervisor === userEmail;

    // Check permissions based on status and role
    if (submission.status === 'accounted') {
      return { error: 'cannot correct accounted' };
    }

    if (!isAdmin && !isHR && !isPlantManager && !isSupervisor && !isAuthor) {
      return { error: 'unauthorized' };
    }

    // Author/Supervisor can only edit pending submissions
    if ((isAuthor || isSupervisor) && !isHR && !isAdmin && !isPlantManager && submission.status !== 'pending') {
      return { error: 'unauthorized' };
    }

    // HR/Plant Manager can edit pending and approved
    if (
      (isHR || isPlantManager) &&
      !isAdmin &&
      !['pending', 'approved'].includes(submission.status)
    ) {
      return { error: 'unauthorized' };
    }

    if (!data.date) {
      throw new Error('Date is required');
    }

    // Build correction history entry with only changed fields
    const changes: any = {};
    if (data.supervisor !== submission.supervisor) {
      changes.supervisor = { from: submission.supervisor, to: data.supervisor };
    }
    if (new Date(data.date).getTime() !== new Date(submission.date).getTime()) {
      changes.date = { from: submission.date, to: data.date };
    }
    if (data.hours !== submission.hours) {
      changes.hours = { from: submission.hours, to: data.hours };
    }
    if (data.reason !== submission.reason) {
      changes.reason = { from: submission.reason, to: data.reason };
    }

    const correctionHistoryEntry: any = {
      correctedAt: new Date(),
      correctedBy: userEmail,
      reason: reason,
      changes,
    };

    // Handle cancellation/un-cancellation
    let newStatus = submission.status;
    if (markAsCancelled) {
      correctionHistoryEntry.statusChanged = {
        from: submission.status,
        to: 'cancelled',
      };
      newStatus = 'cancelled';
    } else if (submission.status === 'cancelled') {
      // Un-cancelling: restore to pending
      correctionHistoryEntry.statusChanged = {
        from: 'cancelled',
        to: 'pending',
      };
      newStatus = 'pending';
    }

    // Remove _id from data to avoid MongoDB immutable field error
    const { _id: _, ...dataWithoutId } = data;

    const updateDoc: any = {
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
    };

    // Clear cancellation fields when un-cancelling
    if (!markAsCancelled && submission.status === 'cancelled') {
      updateDoc.$unset = {
        cancelledAt: '',
        cancelledBy: '',
      };
    }

    const update = await coll.updateOne(
      { _id: new ObjectId(id) },
      updateDoc,
    );

    if (update.matchedCount === 0) {
      return { error: 'not found' };
    }

    // Send email notification to employee if corrected by someone else
    if (!isAuthor) {
      await sendCorrectionEmailToEmployee(
        submission.submittedBy,
        id,
        userEmail as string,
        reason,
        changes,
        correctionHistoryEntry.statusChanged,
        data.hours,
        data.date,
      );
    }

    revalidateTag('overtime', { expire: 0 });
    return { success: 'corrected' };
  } catch (error) {
    console.error(error);
    return { error: 'correctOvertimeSubmission server action error' };
  }
}

/**
 * Delete overtime submission (Admin only)
 * Hard delete from database - available for all statuses
 */
export async function deleteOvertimeSubmission(
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
    const coll = await dbc('overtime_submissions');

    const deleteResult = await coll.deleteOne({ _id: new ObjectId(id) });

    if (deleteResult.deletedCount === 0) {
      return { error: 'not found' };
    }

    revalidateTag('overtime', { expire: 0 });
    return { success: 'deleted' };
  } catch (error) {
    console.error(error);
    return { error: 'deleteOvertimeSubmission server action error' };
  }
}

/**
 * Cancel overtime submission - only before approved
 */
export async function cancelOvertimeSubmission(
  id: string,
): Promise<{ success: 'cancelled' } | { error: string }> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirectToAuth();
  }
  const userEmail = session!.user!.email;

  try {
    const coll = await dbc('overtime_submissions');

    const submission = await coll.findOne({ _id: new ObjectId(id) });
    if (!submission) {
      return { error: 'not found' };
    }

    // Can only cancel own submissions before approval
    if (submission.submittedBy !== userEmail) {
      return { error: 'unauthorized' };
    }

    // Cannot cancel if already approved, accounted, or cancelled
    if (['approved', 'accounted', 'cancelled'].includes(submission.status)) {
      return { error: 'cannot cancel' };
    }

    await coll.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledBy: userEmail,
        },
      },
    );

    revalidateTag('overtime-submissions', { expire: 0 });
    return { success: 'cancelled' };
  } catch (error) {
    console.error(error);
    return { error: 'cancelOvertimeSubmission server action error' };
  }
}

/**
 * Insert payout request
 * Creates a payout request entry (payoutRequest: true, negative hours)
 * Validates that requested hours <= available balance
 */
export async function insertPayoutRequest(data: {
  supervisor: string;
  hours: number;
  reason: string;
}): Promise<{ success: 'inserted' } | { error: string }> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirectToAuth();
  }
  const userEmail = session!.user!.email as string;

  try {
    const coll = await dbc('overtime_submissions');

    // Calculate user's available balance
    // Balance = sum of hours where status NOT IN ('cancelled', 'rejected')
    const balanceResult = await coll
      .aggregate([
        {
          $match: {
            submittedBy: userEmail,
            status: { $nin: ['cancelled', 'rejected'] },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$hours' },
          },
        },
      ])
      .toArray();

    const availableBalance = balanceResult[0]?.total ?? 0;

    // Validate hours <= available balance
    if (data.hours > availableBalance) {
      return { error: 'exceeds_balance' };
    }

    if (availableBalance <= 0) {
      return { error: 'no_balance' };
    }

    const internalId = await generateNextInternalId();

    const payoutRequestToInsert = {
      internalId,
      supervisor: data.supervisor,
      date: new Date(),
      hours: -data.hours, // Negative hours for payout
      reason: data.reason,
      payoutRequest: true,
      status: 'pending',
      submittedAt: new Date(),
      submittedBy: userEmail,
      ...(session!.user!.identifier && {
        submittedByIdentifier: session!.user!.identifier,
      }),
      editedAt: new Date(),
      editedBy: userEmail,
    };

    const res = await coll.insertOne(payoutRequestToInsert);
    if (res) {
      revalidateTag('overtime', { expire: 0 });
      return { success: 'inserted' };
    } else {
      return { error: 'not inserted' };
    }
  } catch (error) {
    console.error(error);
    return { error: 'insertPayoutRequest server action error' };
  }
}
