'use server';

import { auth } from '@/lib/auth';
import { dbc } from '@/lib/db/mongo';
import { ObjectId } from 'mongodb';
import {
  revalidateOvertime,
  sendRejectionEmailToEmployee,
  sendApprovalEmailToEmployee,
  checkIfLatestSupervisor,
} from './utils';
import { redirect } from 'next/navigation';
import {
  getSupervisorCombinedMonthlyUsage,
  getGlobalSupervisorMonthlyLimit,
} from './quota';

/**
 * Approve overtime submission
 * Supports dual-stage approval for payout requests:
 * - Stage 1: Supervisor approval (pending → pending-plant-manager) OR direct approval if within quota
 * - Stage 2: Plant Manager approval (pending-plant-manager → approved)
 * Non-payout submissions: pending → approved (single stage)
 */
export async function approveOvertimeSubmission(id: string) {
  console.log('approveOvertimeSubmission', id);
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth?callbackUrl=/overtime-submissions');
  }
  // TypeScript narrowing: session is guaranteed to be non-null after redirect()
  const userEmail = session!.user!.email as string;

  // Check user roles
  const userRoles = session!.user!.roles ?? [];
  const isHR = userRoles.includes('hr');
  const isAdmin = userRoles.includes('admin');
  const isPlantManager = userRoles.includes('plant-manager');
  const isExternalUser = userRoles.includes('external-overtime-user');

  // External users cannot approve submissions
  if (isExternalUser) {
    return { error: 'unauthorized' };
  }

  try {
    const coll = await dbc('overtime_submissions');

    // First check if this submission exists
    const submission = await coll.findOne({ _id: new ObjectId(id) });
    if (!submission) {
      return { error: 'not found' };
    }

    // Dual approval logic for payout requests only
    if (submission.payoutRequest) {
      if (submission.status === 'pending') {
        // Supervisor approval: move to pending-plant-manager OR directly to approved
        const isLatestSupervisor = await checkIfLatestSupervisor(
          userEmail,
          submission.submittedBy,
        );
        if (
          submission.supervisor !== userEmail &&
          !isLatestSupervisor &&
          !isHR &&
          !isAdmin
        ) {
          return { error: 'unauthorized' };
        }

        // Check if supervisor (leader/manager) can give final approval within quota
        const isLeaderOrManager = userRoles.some(
          (r: string) => /leader|manager/i.test(r) && r !== 'plant-manager',
        );

        // Hours for payout requests are negative, so we use absolute value
        const payoutHours = Math.abs(submission.hours);

        if (isLeaderOrManager && !isPlantManager && !isAdmin) {
          const globalLimit = await getGlobalSupervisorMonthlyLimit();
          if (globalLimit > 0) {
            const usedHours = await getSupervisorCombinedMonthlyUsage(userEmail);
            if (usedHours + payoutHours <= globalLimit) {
              // Supervisor gives final approval within their quota
              const update = await coll.updateOne(
                { _id: new ObjectId(id) },
                {
                  $set: {
                    status: 'approved',
                    supervisorApprovedAt: new Date(),
                    supervisorApprovedBy: userEmail,
                    supervisorFinalApproval: true,
                    approvedAt: new Date(),
                    approvedBy: userEmail,
                  },
                },
              );
              if (update.matchedCount === 0) {
                return { error: 'not found' };
              }
              revalidateOvertime();
              if (!submission.submittedByIdentifier) {
                await sendApprovalEmailToEmployee(
                  submission.submittedBy,
                  id,
                  'final',
                  submission.hours,
                  submission.date,
                );
              }
              return { success: 'approved' };
            }
          }
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
              },
            },
          );
          if (update.matchedCount === 0) {
            return { error: 'not found' };
          }
          revalidateOvertime();
          if (!submission.submittedByIdentifier) {
            await sendApprovalEmailToEmployee(
              submission.submittedBy,
              id,
              'final',
              submission.hours,
              submission.date,
            );
          }
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
            },
          },
        );
        if (update.matchedCount === 0) {
          return { error: 'not found' };
        }
        revalidateOvertime();
        if (!submission.submittedByIdentifier) {
          await sendApprovalEmailToEmployee(
            submission.submittedBy,
            id,
            'supervisor',
            submission.hours,
            submission.date,
          );
        }
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
            },
          },
        );
        if (update.matchedCount === 0) {
          return { error: 'not found' };
        }
        revalidateOvertime();
        if (!submission.submittedByIdentifier) {
          await sendApprovalEmailToEmployee(
            submission.submittedBy,
            id,
            'final',
            submission.hours,
            submission.date,
          );
        }
        return { success: 'plant-manager-approved' };
      } else {
        return { error: 'invalid status' };
      }
    }

    // Non-payout submissions: single-stage approval
    if (submission.status !== 'pending') {
      return { error: 'invalid status' };
    }

    // Allow approval if:
    // 1. User is the assigned supervisor, OR
    // 2. User is the latest supervisor (manager changed), OR
    // 3. User has HR role, OR
    // 4. User has admin role
    const isLatestSupervisor = await checkIfLatestSupervisor(
      userEmail,
      submission.submittedBy,
    );
    if (
      submission.supervisor !== userEmail &&
      !isLatestSupervisor &&
      !isHR &&
      !isAdmin
    ) {
      return { error: 'unauthorized' };
    }

    const update = await coll.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'approved',
          approvedAt: new Date(),
          approvedBy: userEmail,
        },
      },
    );
    if (update.matchedCount === 0) {
      return { error: 'not found' };
    }
    revalidateOvertime();
    // Only send email notification if not an external user (no submittedByIdentifier)
    if (!submission.submittedByIdentifier) {
      await sendApprovalEmailToEmployee(
        submission.submittedBy,
        id,
        'final',
        submission.hours,
        submission.date,
      );
    }
    return { success: 'approved' };
  } catch (error) {
    console.error(error);
    return { error: 'approveOvertimeSubmission server action error' };
  }
}

/**
 * Reject overtime submission
 * Sends rejection email notification to submitter
 * Can reject from either 'pending' or 'pending-plant-manager' status
 */
export async function rejectOvertimeSubmission(
  id: string,
  rejectionReason: string,
) {
  console.log('rejectOvertimeSubmission', id);
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth?callbackUrl=/overtime-submissions');
  }
  const userEmail = session!.user!.email as string;

  // Check if user has HR or admin role for emergency override
  const userRoles = session!.user!.roles ?? [];
  const isHR = userRoles.includes('hr');
  const isAdmin = userRoles.includes('admin');
  const isPlantManager = userRoles.includes('plant-manager');
  const isExternalUser = userRoles.includes('external-overtime-user');

  // External users cannot reject submissions
  if (isExternalUser) {
    return { error: 'unauthorized' };
  }

  try {
    const coll = await dbc('overtime_submissions');

    // First check if this submission exists
    const submission = await coll.findOne({ _id: new ObjectId(id) });
    if (!submission) {
      return { error: 'not found' };
    }

    // Can only reject pending or pending-plant-manager submissions
    if (
      submission.status !== 'pending' &&
      submission.status !== 'pending-plant-manager'
    ) {
      return { error: 'invalid status' };
    }

    // For pending-plant-manager, only plant manager or admin can reject
    if (submission.status === 'pending-plant-manager') {
      if (!isPlantManager && !isAdmin) {
        return { error: 'unauthorized' };
      }
    } else {
      // For pending, allow rejection if:
      // 1. User is the assigned supervisor, OR
      // 2. User is the latest supervisor (manager changed), OR
      // 3. User has HR role, OR
      // 4. User has admin role
      const isLatestSupervisor = await checkIfLatestSupervisor(
        userEmail,
        submission.submittedBy,
      );
      if (
        submission.supervisor !== userEmail &&
        !isLatestSupervisor &&
        !isHR &&
        !isAdmin
      ) {
        return { error: 'unauthorized' };
      }
    }

    const update = await coll.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'rejected',
          rejectedAt: new Date(),
          rejectedBy: userEmail,
          rejectionReason: rejectionReason,
        },
      },
    );
    if (update.matchedCount === 0) {
      return { error: 'not found' };
    }
    revalidateOvertime();
    // Only send email notification if not an external user (no submittedByIdentifier)
    if (!submission.submittedByIdentifier) {
      await sendRejectionEmailToEmployee(
        submission.submittedBy,
        id,
        rejectionReason,
        submission.hours,
        submission.date,
      );
    }
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
    redirect('/auth?callbackUrl=/overtime-submissions');
  }
  const userEmail = session!.user!.email as string;

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
