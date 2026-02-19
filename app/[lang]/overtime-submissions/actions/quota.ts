'use server';

import { dbc } from '@/lib/db/mongo';
import { findEmployeeByEmail } from '@/lib/data/get-employee-identifier';

/**
 * Get per-supervisor monthly payout approval limit based on employee headcount.
 * Limit = (number of employees supervised) × (configured hours per employee).
 * The supervisor is resolved from their email via findEmployeeByEmail (diacritics-insensitive),
 * then their full name is matched against the `manager` field in the employees collection.
 * Returns 0 if config is missing, supervisor can't be resolved, or they have no subordinates
 * — effectively escalating all payouts to plant manager.
 */
export async function getSupervisorMonthlyLimit(
  supervisorEmail: string,
): Promise<number> {
  const configColl = await dbc('individual_overtime_orders_config');
  const config = await configColl.findOne({
    config: 'supervisorPayoutApprovalHoursPerEmployee',
  });
  const hoursPerEmployee = config?.value ?? 0;
  if (hoursPerEmployee <= 0) return 0;

  const supervisor = await findEmployeeByEmail(supervisorEmail);
  if (!supervisor) return 0;

  const managerName = `${supervisor.firstName} ${supervisor.lastName}`;
  const employeesColl = await dbc('employees');
  const count = await employeesColl.countDocuments({ manager: managerName });

  return count * hoursPerEmployee;
}

/**
 * Get supervisor's combined monthly usage for current month
 * Aggregates approvals from BOTH:
 * - Individual Overtime Orders (payout with supervisorFinalApproval)
 * - Overtime Submissions (payout requests only)
 */
export async function getSupervisorCombinedMonthlyUsage(
  supervisorEmail: string,
): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Individual Overtime Orders usage
  const ordersColl = await dbc('individual_overtime_orders');
  const ordersResult = await ordersColl
    .aggregate([
      {
        $match: {
          supervisorApprovedBy: supervisorEmail,
          supervisorFinalApproval: true,
          supervisorApprovedAt: { $gte: startOfMonth },
          status: { $in: ['approved', 'accounted'] },
        },
      },
      { $group: { _id: null, total: { $sum: '$hours' } } },
    ])
    .toArray();

  // Overtime Submissions payout requests usage
  // Note: hours are NEGATIVE for payout requests, so use $abs
  const submissionsColl = await dbc('overtime_submissions');
  const submissionsResult = await submissionsColl
    .aggregate([
      {
        $match: {
          payoutRequest: true,
          approvedBy: supervisorEmail,
          approvedAt: { $gte: startOfMonth },
          status: { $in: ['approved', 'accounted'] },
        },
      },
      { $group: { _id: null, total: { $sum: { $abs: '$hours' } } } },
    ])
    .toArray();

  const ordersHours = ordersResult[0]?.total ?? 0;
  const submissionsHours = submissionsResult[0]?.total ?? 0;

  return ordersHours + submissionsHours;
}
