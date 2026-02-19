'use server';

import { auth } from '@/lib/auth';
import { dbc } from '@/lib/db/mongo';
import { ObjectId } from 'mongodb';
import {
  revalidateOrders,
  sendApprovalEmailToEmployee,
  checkIfLatestSupervisor,
} from './utils';
import { resolveDisplayName } from '@/lib/utils/name-resolver';
import {
  getSupervisorMonthlyLimit,
  getSupervisorCombinedMonthlyUsage,
} from '@/app/[lang]/overtime-submissions/actions/quota';

/**
 * Bulk approve individual overtime orders
 * Handles dual-stage approval logic for payout orders:
 * - pending payout → pending-plant-manager (supervisor approval)
 * - pending-plant-manager payout → approved (plant manager approval)
 * - pending time-off → approved (single stage)
 * Plant managers/admins can complete both stages in one action
 */
export async function bulkApproveOrders(ids: string[]) {
  const session = await auth();
  if (!session || !session.user?.email) {
    return { error: 'unauthorized' };
  }
  const userEmail = session.user.email;
  const userRoles = session.user.roles ?? [];
  const isHR = userRoles.includes('hr');
  const isAdmin = userRoles.includes('admin');
  const isPlantManager = userRoles.includes('plant-manager');

  try {
    const coll = await dbc('individual_overtime_orders');
    const objectIds = ids.map((id) => new ObjectId(id));

    // Fetch all orders
    const orders = await coll
      .find({ _id: { $in: objectIds } })
      .toArray();

    if (orders.length === 0) {
      return { error: 'no eligible orders found' };
    }

    let approvedCount = 0;
    const approverName = await resolveDisplayName(userEmail);

    // Check supervisor quota limit once (for leaders/managers)
    const isLeaderOrManager = userRoles.some(
      (r: string) => /leader|manager/i.test(r) && r !== 'plant-manager',
    );
    let supervisorLimit = 0;
    let usedHours = 0;
    if (isLeaderOrManager && !isPlantManager && !isAdmin) {
      supervisorLimit = await getSupervisorMonthlyLimit(userEmail);
      if (supervisorLimit > 0) {
        usedHours = await getSupervisorCombinedMonthlyUsage(userEmail);
      }
    }

    for (const order of orders) {
      // Check permissions for each order
      const isLatestSupervisor = await checkIfLatestSupervisor(
        userEmail,
        order.submittedBy,
      );
      const canApproveAsSupervisor =
        order.supervisor === userEmail || isLatestSupervisor || isHR || isAdmin;

      // Handle payout orders (dual-stage approval)
      if (order.payment) {
        if (order.status === 'pending') {
          if (!canApproveAsSupervisor) continue;

          // Check if supervisor can give final approval within quota
          if (isLeaderOrManager && !isPlantManager && !isAdmin && supervisorLimit > 0) {
            if (usedHours + order.hours <= supervisorLimit) {
              // Supervisor gives final approval within their quota
              await coll.updateOne(
                { _id: order._id },
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
              usedHours += order.hours;
              approvedCount++;
              if (order.employeeEmail) {
                try {
                  await sendApprovalEmailToEmployee(
                    order.employeeEmail,
                    order._id.toString(),
                    'final',
                    order.payment,
                    approverName,
                    order.scheduledDayOff,
                    order.workStartTime,
                    order.workEndTime,
                    order.hours,
                  );
                } catch (emailError) {
                  console.error(`Failed to send email for order ${order._id}:`, emailError);
                }
              }
              continue;
            }
          }

          // If supervisor is also a plant manager, complete approval in one step
          if (isPlantManager || isAdmin) {
            await coll.updateOne(
              { _id: order._id },
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
            approvedCount++;
            if (order.employeeEmail) {
              try {
                await sendApprovalEmailToEmployee(
                  order.employeeEmail,
                  order._id.toString(),
                  'final',
                  order.payment,
                  approverName,
                  order.scheduledDayOff,
                  order.workStartTime,
                  order.workEndTime,
                  order.hours,
                );
              } catch (emailError) {
                console.error(`Failed to send email for order ${order._id}:`, emailError);
              }
            }
          } else {
            // Move to pending-plant-manager for second approval
            await coll.updateOne(
              { _id: order._id },
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
            approvedCount++;
            if (order.employeeEmail) {
              try {
                await sendApprovalEmailToEmployee(
                  order.employeeEmail,
                  order._id.toString(),
                  'supervisor',
                  order.payment,
                  approverName,
                  order.scheduledDayOff,
                  order.workStartTime,
                  order.workEndTime,
                  order.hours,
                );
              } catch (emailError) {
                console.error(`Failed to send email for order ${order._id}:`, emailError);
              }
            }
          }
        } else if (order.status === 'pending-plant-manager') {
          // Only plant manager or admin can approve
          if (!isPlantManager && !isAdmin) continue;

          await coll.updateOne(
            { _id: order._id },
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
          approvedCount++;
          if (order.employeeEmail) {
            try {
              await sendApprovalEmailToEmployee(
                order.employeeEmail,
                order._id.toString(),
                'final',
                order.payment,
                approverName,
                order.scheduledDayOff,
                order.workStartTime,
                order.workEndTime,
                order.hours,
              );
            } catch (emailError) {
              console.error(`Failed to send email for order ${order._id}:`, emailError);
            }
          }
        }
      } else {
        // Time-off orders (scheduledDayOff) - single stage approval
        if (order.status !== 'pending') continue;
        if (!canApproveAsSupervisor) continue;

        await coll.updateOne(
          { _id: order._id },
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
        approvedCount++;
        if (order.employeeEmail) {
          try {
            await sendApprovalEmailToEmployee(
              order.employeeEmail,
              order._id.toString(),
              'final',
              order.payment,
              approverName,
              order.scheduledDayOff,
              order.workStartTime,
              order.workEndTime,
              order.hours,
            );
          } catch (emailError) {
            console.error(`Failed to send email for order ${order._id}:`, emailError);
          }
        }
      }
    }

    if (approvedCount === 0) {
      return { error: 'no eligible orders found' };
    }

    revalidateOrders();
    return {
      success: `${approvedCount} orders approved`,
      count: approvedCount,
    };
  } catch (error) {
    console.error(error);
    return { error: 'bulkApproveOrders server action error' };
  }
}

/**
 * Bulk mark individual overtime orders as accounted
 * Only HR and Admin can perform this action on approved orders
 */
export async function bulkMarkAsAccountedOrders(ids: string[]) {
  const session = await auth();
  if (!session || !session.user?.email) {
    return { error: 'unauthorized' };
  }
  const userEmail = session.user.email;
  const userRoles = session.user.roles ?? [];
  const isHR = userRoles.includes('hr');
  const isAdmin = userRoles.includes('admin');

  if (!isHR && !isAdmin) {
    return { error: 'unauthorized' };
  }

  try {
    const coll = await dbc('individual_overtime_orders');
    const objectIds = ids.map((id) => new ObjectId(id));

    const update = await coll.updateMany(
      {
        _id: { $in: objectIds },
        status: 'approved',
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

    if (update.modifiedCount === 0) {
      return { error: 'no eligible orders found' };
    }

    revalidateOrders();
    return {
      success: `${update.modifiedCount} orders marked as accounted`,
      count: update.modifiedCount,
    };
  } catch (error) {
    console.error(error);
    return { error: 'bulkMarkAsAccountedOrders server action error' };
  }
}

/**
 * Bulk cancel individual overtime orders
 * Cancels without reason (simplified for bulk operations)
 */
export async function bulkCancelOrders(ids: string[]) {
  const session = await auth();
  if (!session || !session.user?.email) {
    return { error: 'unauthorized' };
  }
  const userEmail = session.user.email;
  const userRoles = session.user.roles ?? [];
  const isHR = userRoles.includes('hr');
  const isAdmin = userRoles.includes('admin');
  const isPlantManager = userRoles.includes('plant-manager');

  try {
    const coll = await dbc('individual_overtime_orders');
    const objectIds = ids.map((id) => new ObjectId(id));

    // Fetch orders to check permissions
    const orders = await coll.find({ _id: { $in: objectIds } }).toArray();

    // Filter orders that the user can cancel
    const cancellableOrders = [];
    for (const order of orders) {
      // Don't allow canceling if status is not pending or pending-plant-manager
      if (order.status !== 'pending' && order.status !== 'pending-plant-manager') {
        continue;
      }

      // Check if user has permission to cancel
      const isLatestSupervisor = await checkIfLatestSupervisor(
        userEmail,
        order.submittedBy,
      );
      const canCancel =
        order.createdBy === userEmail ||
        order.supervisor === userEmail ||
        isLatestSupervisor ||
        isHR ||
        isAdmin ||
        isPlantManager;

      if (canCancel) {
        cancellableOrders.push(order);
      }
    }

    if (cancellableOrders.length === 0) {
      return { error: 'no orders can be cancelled' };
    }

    const cancellableIds = cancellableOrders.map((o) => o._id);

    const update = await coll.updateMany(
      { _id: { $in: cancellableIds } },
      {
        $set: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledBy: userEmail,
          cancellationReason: 'Bulk cancellation',
          editedAt: new Date(),
          editedBy: userEmail,
        },
      },
    );

    revalidateOrders();
    return {
      success: `${update.modifiedCount} orders cancelled`,
      count: update.modifiedCount,
    };
  } catch (error) {
    console.error(error);
    return { error: 'bulkCancelOrders server action error' };
  }
}
