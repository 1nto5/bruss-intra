'use server';

import { dbc } from '@/lib/db/mongo';

export interface OvertimeSummary {
  currentMonthHours: number;
  totalHours: number;
  pendingMonthHours: number;
  pendingTotalHours: number;
  monthLabel: string;
}

export async function calculateUnclaimedOvertimeHours(
  userEmail: string,
  selectedMonth?: string,
): Promise<OvertimeSummary> {
  try {
    const coll = await dbc('overtime_submissions');

    // Determine which month to calculate for
    let targetMonth: Date;
    let monthLabel: string;

    if (selectedMonth) {
      // Parse selected month (format: "YYYY-MM")
      const [year, month] = selectedMonth.split('-').map(Number);
      targetMonth = new Date(year, month - 1, 1);
      monthLabel = `${month.toString().padStart(2, '0')}.${year}`;
    } else {
      // Use current month
      const now = new Date();
      targetMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      monthLabel = '';
    }

    const currentMonth = targetMonth.getMonth();
    const currentYear = targetMonth.getFullYear();

    // Calculate start and end of target month
    const startOfTargetMonth = new Date(currentYear, currentMonth, 1);
    const endOfTargetMonth = new Date(
      currentYear,
      currentMonth + 1,
      0,
      23,
      59,
      59,
      999,
    );

    // Get all overtime submissions for the user, excluding accounted and cancelled
    const allRelevantSubmissions = await coll
      .find({
        submittedBy: userEmail,
        status: { $nin: ['accounted', 'cancelled'] },
      })
      .toArray();

    // Main summary: exclude 'pending' and 'pending-plant-manager'
    // Also exclude "zlecenia" (orders with payment or scheduledDayOff)
    const mainSubmissions = allRelevantSubmissions.filter(
      (s) =>
        s.status !== 'pending' &&
        s.status !== 'pending-plant-manager' &&
        !s.payment &&
        !s.scheduledDayOff,
    );
    // Pending summary
    // Also exclude "zlecenia" from pending
    const pendingSubmissions = allRelevantSubmissions.filter(
      (s) =>
        (s.status === 'pending' || s.status === 'pending-plant-manager') &&
        !s.payment &&
        !s.scheduledDayOff,
    );

    // Calculate total hours (excluding pending)
    const totalHours = mainSubmissions.reduce(
      (sum, submission) => sum + (submission.hours || 0),
      0,
    );

    // Calculate target month hours (excluding pending)
    const currentMonthHours = mainSubmissions
      .filter((submission) => {
        const submissionDate = new Date(submission.date);
        return (
          submissionDate >= startOfTargetMonth &&
          submissionDate <= endOfTargetMonth
        );
      })
      .reduce((sum, submission) => sum + (submission.hours || 0), 0);

    // Calculate pending hours (total)
    const pendingTotalHours = pendingSubmissions.reduce(
      (sum, submission) => sum + (submission.hours || 0),
      0,
    );

    // Calculate pending hours (month)
    const pendingMonthHours = pendingSubmissions
      .filter((submission) => {
        const submissionDate = new Date(submission.date);
        return (
          submissionDate >= startOfTargetMonth &&
          submissionDate <= endOfTargetMonth
        );
      })
      .reduce((sum, submission) => sum + (submission.hours || 0), 0);

    return {
      currentMonthHours,
      totalHours,
      pendingMonthHours,
      pendingTotalHours,
      monthLabel,
    };
  } catch (error) {
    console.error('Error calculating overtime hours:', error);
    return {
      currentMonthHours: 0,
      totalHours: 0,
      pendingMonthHours: 0,
      pendingTotalHours: 0,
      monthLabel: '',
    };
  }
}

/**
 * Calculate overtime summary directly from filtered submissions array.
 * This ensures the summary matches the filtered data being displayed.
 */
export async function calculateSummaryFromSubmissions(
  submissions: Array<{
    date: Date;
    hours: number;
    status: string;
  }>,
  selectedMonth?: string,
  selectedYear?: string,
  onlyOrders?: boolean,
): Promise<OvertimeSummary> {
  try {
    // Determine which month to calculate for
    let targetMonth: Date;
    let monthLabel: string;

    if (selectedMonth) {
      // Parse selected month (format: "YYYY-MM")
      const [year, month] = selectedMonth.split('-').map(Number);
      targetMonth = new Date(year, month - 1, 1);
      monthLabel = `${month.toString().padStart(2, '0')}.${year}`;
    } else if (selectedYear) {
      // Year selected without specific month
      const now = new Date();
      targetMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      monthLabel = `${selectedYear}`;
    } else {
      // Use current month
      const now = new Date();
      targetMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      monthLabel = '';
    }

    const currentMonth = targetMonth.getMonth();
    const currentYear = targetMonth.getFullYear();

    // Calculate start and end of target month
    const startOfTargetMonth = new Date(currentYear, currentMonth, 1);
    const endOfTargetMonth = new Date(
      currentYear,
      currentMonth + 1,
      0,
      23,
      59,
      59,
      999,
    );

    // Filter out cancelled submissions (if any)
    const relevantSubmissions = submissions.filter(
      (s) => s.status !== 'cancelled',
    );

    // When onlyOrders is true, we ONLY want entries with payment or scheduledDayOff
    // When onlyOrders is false, we EXCLUDE entries with payment or scheduledDayOff (normal overtime)

    // Main submissions: exclude 'pending' and 'pending-plant-manager'
    const mainSubmissions = relevantSubmissions.filter((s) => {
      if (s.status === 'pending' || s.status === 'pending-plant-manager') {
        return false;
      }

      if (onlyOrders) {
        // For orders view: only include entries with payment OR scheduledDayOff
        return !!(s as any).payment || !!(s as any).scheduledDayOff;
      } else {
        // For normal view: exclude orders (entries with payment or scheduledDayOff)
        return !(s as any).payment && !(s as any).scheduledDayOff;
      }
    });

    // Pending submissions
    const pendingSubmissions = relevantSubmissions.filter((s) => {
      if (s.status !== 'pending' && s.status !== 'pending-plant-manager') {
        return false;
      }

      if (onlyOrders) {
        // For orders view: only include entries with payment OR scheduledDayOff
        return !!(s as any).payment || !!(s as any).scheduledDayOff;
      } else {
        // For normal view: exclude orders (entries with payment or scheduledDayOff)
        return !(s as any).payment && !(s as any).scheduledDayOff;
      }
    });

    // Calculate total hours (excluding pending)
    const totalHours = mainSubmissions.reduce(
      (sum, submission) => sum + (submission.hours || 0),
      0,
    );

    // Calculate target month hours (excluding pending)
    const currentMonthHours = mainSubmissions
      .filter((submission) => {
        const submissionDate = new Date(submission.date);
        return (
          submissionDate >= startOfTargetMonth &&
          submissionDate <= endOfTargetMonth
        );
      })
      .reduce((sum, submission) => sum + (submission.hours || 0), 0);

    // Calculate pending hours (total)
    const pendingTotalHours = pendingSubmissions.reduce(
      (sum, submission) => sum + (submission.hours || 0),
      0,
    );

    // Calculate pending hours (month)
    const pendingMonthHours = pendingSubmissions
      .filter((submission) => {
        const submissionDate = new Date(submission.date);
        return (
          submissionDate >= startOfTargetMonth &&
          submissionDate <= endOfTargetMonth
        );
      })
      .reduce((sum, submission) => sum + (submission.hours || 0), 0);

    return {
      currentMonthHours,
      totalHours,
      pendingMonthHours,
      pendingTotalHours,
      monthLabel,
    };
  } catch (error) {
    console.error('Error calculating summary from submissions:', error);
    return {
      currentMonthHours: 0,
      totalHours: 0,
      pendingMonthHours: 0,
      pendingTotalHours: 0,
      monthLabel: '',
    };
  }
}
