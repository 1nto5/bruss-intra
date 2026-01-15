'use server';

import { redirectToAuth } from '@/app/[lang]/actions';
import { auth } from '@/lib/auth';
import { dbc } from '@/lib/db/mongo';
import { ObjectId } from 'mongodb';
import { revalidateTag } from 'next/cache';
import { OvertimeSubmissionType } from '../lib/types';
import { generateNextInternalId } from './utils';

/**
 * Insert new overtime submission
 * Available to all authenticated users
 * HR/Admin can create on behalf of other users via onBehalfOf parameter
 */
export async function insertOvertimeSubmission(
  data: OvertimeSubmissionType,
  onBehalfOf?: string,
): Promise<{ success: 'inserted' } | { error: string }> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirectToAuth();
  }
  // TypeScript narrowing: session is guaranteed to be non-null after redirectToAuth()
  const userEmail = session!.user!.email as string;
  const userRoles = session!.user!.roles ?? [];
  const isHR = userRoles.includes('hr');
  const isAdmin = userRoles.includes('admin');

  // Determine submittedBy and createdBy based on role and onBehalfOf
  let submittedBy = userEmail;
  let createdBy: string | undefined;

  if (onBehalfOf && (isHR || isAdmin)) {
    submittedBy = onBehalfOf;
    createdBy = userEmail;
  }

  try {
    const coll = await dbc('overtime_submissions');

    const internalId = await generateNextInternalId();

    // Date is only required for regular overtime (not work orders/overtime requests)
    if (!data.overtimeRequest && !data.date) {
      throw new Error('Date is required');
    }

    // Exclude _id from insert (MongoDB will generate it)
    const { _id, ...dataWithoutId } = data;

    // For overtime requests, exclude the date field
    const submissionData = data.overtimeRequest
      ? { ...dataWithoutId, date: undefined }
      : dataWithoutId;

    const overtimeSubmissionToInsert = {
      internalId,
      ...submissionData,
      status: 'pending', // Always set to pending for new submissions
      payment: data.payment ?? false,
      submittedAt: new Date(),
      submittedBy,
      ...(createdBy && { createdBy }),
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

    // Date is only required for regular overtime (not work orders/overtime requests)
    if (!data.overtimeRequest && !data.date) {
      throw new Error('Date is required');
    }

    // Prevent editing the payment field after submission, handle date for overtime requests
    const updateData = data.overtimeRequest
      ? { ...data, payment: submission.payment, date: undefined }
      : { ...data, payment: submission.payment };

    // Build edit history entry with only changed fields
    const changes: any = {};
    if (updateData.supervisor !== submission.supervisor) {
      changes.supervisor = {
        from: submission.supervisor,
        to: updateData.supervisor,
      };
    }
    if (
      updateData.date &&
      new Date(updateData.date).getTime() !==
        new Date(submission.date).getTime()
    ) {
      changes.date = { from: submission.date, to: updateData.date };
    }
    if (updateData.hours !== submission.hours) {
      changes.hours = { from: submission.hours, to: updateData.hours };
    }
    if (updateData.reason !== submission.reason) {
      changes.reason = { from: submission.reason, to: updateData.reason };
    }
    if (updateData.overtimeRequest !== submission.overtimeRequest) {
      changes.overtimeRequest = {
        from: submission.overtimeRequest,
        to: updateData.overtimeRequest,
      };
    }
    if (updateData.payment !== submission.payment) {
      changes.payment = { from: submission.payment, to: updateData.payment };
    }
    const oldScheduledDayOff = submission.scheduledDayOff
      ? new Date(submission.scheduledDayOff).getTime()
      : undefined;
    const newScheduledDayOff = updateData.scheduledDayOff
      ? new Date(updateData.scheduledDayOff).getTime()
      : undefined;
    if (oldScheduledDayOff !== newScheduledDayOff) {
      changes.scheduledDayOff = {
        from: submission.scheduledDayOff,
        to: updateData.scheduledDayOff,
      };
    }

    const editHistoryEntry = {
      editedAt: new Date(),
      editedBy: userEmail,
      changes,
    };

    // Remove _id from updateData to avoid MongoDB immutable field error
    const { _id: _, ...updateDataWithoutId } = updateData;

    const update = await coll.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...updateDataWithoutId,
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

    // Date is only required for regular overtime (not work orders/overtime requests)
    if (!data.overtimeRequest && !data.date) {
      throw new Error('Date is required');
    }

    // For overtime requests, set date to undefined
    const submissionData = data.overtimeRequest
      ? { ...data, date: undefined }
      : data;

    // HR/Admin can edit submissions in any status

    // Build edit history entry with only changed fields
    const changes: any = {};
    if (submissionData.supervisor !== submission.supervisor) {
      changes.supervisor = {
        from: submission.supervisor,
        to: submissionData.supervisor,
      };
    }
    if (
      submissionData.date &&
      new Date(submissionData.date).getTime() !==
        new Date(submission.date).getTime()
    ) {
      changes.date = { from: submission.date, to: submissionData.date };
    }
    if (submissionData.hours !== submission.hours) {
      changes.hours = { from: submission.hours, to: submissionData.hours };
    }
    if (submissionData.reason !== submission.reason) {
      changes.reason = { from: submission.reason, to: submissionData.reason };
    }
    if (submissionData.overtimeRequest !== submission.overtimeRequest) {
      changes.overtimeRequest = {
        from: submission.overtimeRequest,
        to: submissionData.overtimeRequest,
      };
    }
    if (submissionData.payment !== submission.payment) {
      changes.payment = {
        from: submission.payment,
        to: submissionData.payment,
      };
    }
    const oldScheduledDayOff = submission.scheduledDayOff
      ? new Date(submission.scheduledDayOff).getTime()
      : undefined;
    const newScheduledDayOff = data.scheduledDayOff
      ? new Date(data.scheduledDayOff).getTime()
      : undefined;
    if (oldScheduledDayOff !== newScheduledDayOff) {
      changes.scheduledDayOff = {
        from: submission.scheduledDayOff,
        to: data.scheduledDayOff,
      };
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

    // Remove _id from submissionData to avoid MongoDB immutable field error
    const { _id: _, ...submissionDataWithoutId } = submissionData;

    // Update submission and reset status to pending for re-approval
    const update = await coll.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...submissionDataWithoutId,
          status: 'pending',
          editedAt: new Date(),
          editedBy: userEmail,
        },
        $unset: {
          approvedAt: '',
          approvedBy: '',
          plantManagerApprovedAt: '',
          plantManagerApprovedBy: '',
          supervisorApprovedAt: '',
          supervisorApprovedBy: '',
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

  try {
    const coll = await dbc('overtime_submissions');

    // Check if the submission exists
    const submission = await coll.findOne({ _id: new ObjectId(id) });
    if (!submission) {
      return { error: 'not found' };
    }

    const isAuthor = submission.submittedBy === userEmail;

    // Check permissions based on status and role
    if (submission.status === 'accounted') {
      return { error: 'cannot correct accounted' };
    }

    if (!isAdmin && !isHR && !isAuthor) {
      return { error: 'unauthorized' };
    }

    if (isAuthor && !isHR && !isAdmin && submission.status !== 'pending') {
      return { error: 'unauthorized' };
    }

    if (
      isHR &&
      !isAdmin &&
      !['pending', 'approved'].includes(submission.status)
    ) {
      return { error: 'unauthorized' };
    }

    // Ensure date is set
    if (data.overtimeRequest && data.workStartTime && !data.date) {
      const dateFromStart = new Date(data.workStartTime);
      dateFromStart.setHours(0, 0, 0, 0);
      data.date = dateFromStart;
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
    if (data.overtimeRequest !== submission.overtimeRequest) {
      changes.overtimeRequest = {
        from: submission.overtimeRequest,
        to: data.overtimeRequest,
      };
    }
    if (data.payment !== submission.payment) {
      changes.payment = { from: submission.payment, to: data.payment };
    }
    const oldScheduledDayOff = submission.scheduledDayOff
      ? new Date(submission.scheduledDayOff).getTime()
      : undefined;
    const newScheduledDayOff = data.scheduledDayOff
      ? new Date(data.scheduledDayOff).getTime()
      : undefined;
    if (oldScheduledDayOff !== newScheduledDayOff) {
      changes.scheduledDayOff = {
        from: submission.scheduledDayOff,
        to: data.scheduledDayOff,
      };
    }

    const correctionHistoryEntry: any = {
      correctedAt: new Date(),
      correctedBy: userEmail,
      reason: reason,
      changes,
    };

    // Handle cancellation if requested
    let newStatus = submission.status;
    if (markAsCancelled) {
      correctionHistoryEntry.statusChanged = {
        from: submission.status,
        to: 'cancelled',
      };
      newStatus = 'cancelled';
    }

    // Remove _id from data to avoid MongoDB immutable field error
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
