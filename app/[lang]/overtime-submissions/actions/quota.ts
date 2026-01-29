'use server';

import { dbc } from '@/lib/db/mongo';

/**
 * Get global supervisor monthly approval limit from config
 * Shared between Individual Overtime Orders and Overtime Submissions
 */
export async function getGlobalSupervisorMonthlyLimit(): Promise<number> {
  const configColl = await dbc('individual_overtime_orders_config');
  const config = await configColl.findOne({
    config: 'supervisorPayoutApprovalMonthlyLimit',
  });
  return config?.value ?? 0;
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
