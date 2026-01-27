'use server';

import { auth } from '@/lib/auth';
import { dbc } from '@/lib/db/mongo';
import { ObjectId } from 'mongodb';
import {
  revalidateOrders,
  sendRejectionEmailToEmployee,
  sendApprovalEmailToEmployee,
  checkIfLatestSupervisor,
} from './utils';
import { redirectToAuth } from '@/app/[lang]/actions';
import { resolveDisplayName } from '@/lib/utils/name-resolver';
import type { CorrectionHistoryEntry } from '../lib/types';
import { getSupervisorCombinedMonthlyUsage } from '@/app/[lang]/overtime-submissions/actions/quota';

/**
 * Get global supervisor monthly approval limit from config
 */
export async function getGlobalSupervisorMonthlyLimit(): Promise<number> {
  const configColl = await dbc('individual_overtime_orders_config');
  const config = await configColl.findOne({
    config: 'supervisorPayoutApprovalMonthlyLimit',
  });
  return config?.value ?? 0;
}


/**
 * Approve individual overtime order
 * Supports dual-stage approval for payout orders:
 * - Stage 1: Supervisor approval (pending → pending-plant-manager)
 * - Stage 2: Plant Manager approval (pending-plant-manager → approved)
 * Time-off orders (scheduledDayOff): pending → approved (single stage)
 */
export async function approveOrder(id: string) {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirectToAuth();
  }
  const userEmail = session!.user!.email as string;

  const userRoles = session!.user!.roles ?? [];
  const isHR = userRoles.includes('hr');
  const isAdmin = userRoles.includes('admin');
  const isPlantManager = userRoles.includes('plant-manager');

  try {
    const coll = await dbc('individual_overtime_orders');

    const order = await coll.findOne({ _id: new ObjectId(id) });
    if (!order) {
      return { error: 'not found' };
    }

    // Dual approval logic for payout orders only
    if (order.payment) {
      if (order.status === 'pending') {
        // Supervisor approval: move to pending-plant-manager OR directly to approved
        const isLatestSupervisor = await checkIfLatestSupervisor(
          userEmail,
          order.submittedBy,
        );
        if (
          order.supervisor !== userEmail &&
          !isLatestSupervisor &&
          !isHR &&
          !isAdmin
        ) {
          return { error: 'unauthorized' };
        }

        // Check if supervisor (leader/manager) can give final approval within quota
        const isLeaderOrManager = userRoles.some(
          (r: string) =>
            (/leader|manager/i.test(r) && r !== 'plant-manager'),
        );

        if (isLeaderOrManager && !isPlantManager && !isAdmin) {
          const globalLimit = await getGlobalSupervisorMonthlyLimit();
          if (globalLimit > 0) {
            const usedHours = await getSupervisorCombinedMonthlyUsage(userEmail);
            if (usedHours + order.hours <= globalLimit) {
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
                    editedAt: new Date(),
                    editedBy: userEmail,
                  },
                },
              );
              if (update.matchedCount === 0) {
                return { error: 'not found' };
              }
              revalidateOrders();
              if (order.employeeEmail) {
                const approverName = await resolveDisplayName(userEmail);
                await sendApprovalEmailToEmployee(
                  order.employeeEmail,
                  id,
                  'final',
                  order.payment,
                  approverName,
                  order.scheduledDayOff,
                  order.workStartTime,
                  order.workEndTime,
                  order.hours,
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
                editedAt: new Date(),
                editedBy: userEmail,
              },
            },
          );
          if (update.matchedCount === 0) {
            return { error: 'not found' };
          }
          revalidateOrders();
          if (order.employeeEmail) {
            const approverName = await resolveDisplayName(userEmail);
            await sendApprovalEmailToEmployee(
              order.employeeEmail,
              id,
              'final',
              order.payment,
              approverName,
              order.scheduledDayOff,
              order.workStartTime,
              order.workEndTime,
              order.hours,
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
              editedAt: new Date(),
              editedBy: userEmail,
            },
          },
        );
        if (update.matchedCount === 0) {
          return { error: 'not found' };
        }
        revalidateOrders();
        if (order.employeeEmail) {
          const approverName = await resolveDisplayName(userEmail);
          await sendApprovalEmailToEmployee(
            order.employeeEmail,
            id,
            'supervisor',
            order.payment,
            approverName,
            order.scheduledDayOff,
            order.workStartTime,
            order.workEndTime,
            order.hours,
          );
        }
        return { success: 'supervisor-approved' };
      } else if (order.status === 'pending-plant-manager') {
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
        revalidateOrders();
        if (order.employeeEmail) {
          const approverName = await resolveDisplayName(userEmail);
          await sendApprovalEmailToEmployee(
            order.employeeEmail,
            id,
            'final',
            order.payment,
            approverName,
            order.scheduledDayOff,
            order.workStartTime,
            order.workEndTime,
            order.hours,
          );
        }
        return { success: 'plant-manager-approved' };
      } else {
        return { error: 'invalid status' };
      }
    }

    // Time-off orders (scheduledDayOff) - single stage approval
    const isLatestSupervisorForTimeOff = await checkIfLatestSupervisor(
      userEmail,
      order.submittedBy,
    );
    if (
      order.supervisor !== userEmail &&
      !isLatestSupervisorForTimeOff &&
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
          editedAt: new Date(),
          editedBy: userEmail,
        },
      },
    );
    if (update.matchedCount === 0) {
      return { error: 'not found' };
    }
    revalidateOrders();
    if (order.employeeEmail) {
      const approverName = await resolveDisplayName(userEmail);
      await sendApprovalEmailToEmployee(
        order.employeeEmail,
        id,
        'final',
        order.payment,
        approverName,
        order.scheduledDayOff,
        order.workStartTime,
        order.workEndTime,
        order.hours,
      );
    }
    return { success: 'approved' };
  } catch (error) {
    console.error(error);
    return { error: 'approveOrder server action error' };
  }
}

/**
 * Reject individual overtime order
 * Sends rejection email notification to submitter
 */
export async function rejectOrder(
  id: string,
  rejectionReason: string,
) {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirectToAuth();
  }
  const userEmail = session!.user!.email as string;

  const userRoles = session!.user!.roles ?? [];
  const isHR = userRoles.includes('hr');
  const isAdmin = userRoles.includes('admin');

  try {
    const coll = await dbc('individual_overtime_orders');

    const order = await coll.findOne({ _id: new ObjectId(id) });
    if (!order) {
      return { error: 'not found' };
    }

    const isLatestSupervisorForReject = await checkIfLatestSupervisor(
      userEmail,
      order.submittedBy,
    );
    if (
      order.supervisor !== userEmail &&
      !isLatestSupervisorForReject &&
      !isHR &&
      !isAdmin
    ) {
      return { error: 'unauthorized' };
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
    revalidateOrders();
    if (order.employeeEmail) {
      await sendRejectionEmailToEmployee(
        order.employeeEmail,
        id,
        rejectionReason,
        order.payment,
        order.scheduledDayOff,
        order.workStartTime,
        order.workEndTime,
        order.hours,
      );
    }
    return { success: 'rejected' };
  } catch (error) {
    console.error(error);
    return { error: 'rejectOrder server action error' };
  }
}

/**
 * Mark individual overtime order as accounted (settled)
 * Only HR and Admin can perform this action
 */
export async function markAsAccountedOrder(id: string) {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirectToAuth();
  }
  const userEmail = session!.user!.email as string;

  const isHR = (session!.user!.roles ?? []).includes('hr');
  const isAdmin = (session!.user!.roles ?? []).includes('admin');

  if (!isHR && !isAdmin) {
    return { error: 'unauthorized' };
  }

  try {
    const coll = await dbc('individual_overtime_orders');
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
    revalidateOrders();
    return { success: 'accounted' };
  } catch (error) {
    console.error(error);
    return { error: 'markAsAccountedOrder server action error' };
  }
}

/**
 * Supervisor sets scheduled day off for pending-plant-manager orders
 * Converts payout order to time-off and changes status to approved
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
    const coll = await dbc('individual_overtime_orders');

    const order = await coll.findOne({ _id: new ObjectId(id) });
    if (!order) {
      return { error: 'not found' };
    }

    // Permission: assigned supervisor OR latest supervisor (manager changed)
    const isLatestSupervisorForDayOff = await checkIfLatestSupervisor(
      userEmail,
      order.submittedBy,
    );
    if (order.supervisor !== userEmail && !isLatestSupervisorForDayOff) {
      return { error: 'unauthorized' };
    }

    // Status: must be pending-plant-manager
    if (order.status !== 'pending-plant-manager') {
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

    revalidateOrders();
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: 'supervisorSetScheduledDayOff server action error' };
  }
}
