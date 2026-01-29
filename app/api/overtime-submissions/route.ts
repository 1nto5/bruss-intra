import { dbc } from '@/lib/db/mongo';
import { resolveDisplayNames } from '@/lib/utils/name-resolver';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const userEmail = searchParams.get('userEmail');
  const userRoles = searchParams.get('userRoles')?.split(',') || [];

  try {
    const coll = await dbc('overtime_submissions');

    // Get user roles
    const isManager = userRoles.some(
      (role: string) =>
        role.toLowerCase().includes('manager') ||
        role.toLowerCase().includes('group-leader'),
    );
    const isAdmin = userRoles.includes('admin');
    const isHR = userRoles.includes('hr');

    // Build base query based on user permissions
    let baseQuery: any = {};

    if (isAdmin || isHR) {
      // Admins and HR can see all submissions
      baseQuery = {};
    } else if (isManager) {
      // Managers can see submissions they supervise and their own submissions
      baseQuery = {
        $or: [
          { supervisor: userEmail },
          { submittedBy: userEmail },
        ],
      };
    } else {
      // Regular employees can only see their own submissions
      baseQuery = { submittedBy: userEmail };
    }

    // Apply filters from search parameters
    const filters: any = { ...baseQuery };

    // Pending settlements filter - for HR/Admin only
    if (searchParams.get('pendingSettlements') === 'true' && (isAdmin || isHR)) {
      filters.status = 'approved';
      // Clear baseQuery restrictions for HR when viewing pending settlements
      delete filters.$or;
      delete filters.submittedBy;
      delete filters.supervisor;
    } else {
      // Only my submissions filter - overrides baseQuery to show only user's own submissions
      if (searchParams.get('onlyMySubmissions') === 'true') {
        filters.submittedBy = userEmail;
        // Remove the $or clause if it exists
        delete filters.$or;
      }

      // Assigned to me filter - shows all submissions where I'm the supervisor
      if (searchParams.get('assignedToMe') === 'true') {
        // Show all submissions where the current user is the supervisor, regardless of status
        filters.supervisor = userEmail;
        // Remove submittedBy filter if it exists from onlyMySubmissions
        delete filters.submittedBy;
        // Remove the $or clause if it exists
        delete filters.$or;
        // Don't filter by status - show all
      }

      // Employee filter - for HR, Admin, and Managers
      if (searchParams.get('employee') && (isAdmin || isHR || isManager)) {
        const employees = searchParams.get('employee')!.split(',');
        if (employees.length > 1) {
          filters.submittedBy = { $in: employees };
        } else {
          filters.submittedBy = searchParams.get('employee');
        }
        // Remove the $or clause if it exists
        delete filters.$or;
      }
    }

    // Status filter
    if (searchParams.get('status')) {
      const statuses = searchParams.get('status')!.split(',');
      if (statuses.length > 1) {
        filters.status = { $in: statuses };
      } else {
        filters.status = searchParams.get('status');
      }
    }

    // Week filter - for HR/Admin only (mutually exclusive with month)
    if (searchParams.get('week') && (isAdmin || isHR)) {
      const weeks = searchParams.get('week')!.split(',');

      // Helper function to get Monday of ISO week
      const getFirstDayOfISOWeek = (year: number, week: number): Date => {
        const simple = new Date(year, 0, 1 + (week - 1) * 7);
        const dayOfWeek = simple.getDay();
        const isoWeekStart = simple;
        if (dayOfWeek <= 4) {
          isoWeekStart.setDate(simple.getDate() - simple.getDay() + 1);
        } else {
          isoWeekStart.setDate(simple.getDate() + 8 - simple.getDay());
        }
        return isoWeekStart;
      };

      if (weeks.length > 1) {
        filters.$or = weeks.map((weekStr) => {
          // Parse format: "2025-W42"
          const [yearStr, weekPart] = weekStr.split('-W');
          const year = parseInt(yearStr);
          const week = parseInt(weekPart);
          const monday = getFirstDayOfISOWeek(year, week);
          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);
          sunday.setHours(23, 59, 59, 999);
          return {
            date: {
              $gte: monday,
              $lte: sunday,
            },
          };
        });
      } else {
        const [yearStr, weekPart] = searchParams.get('week')!.split('-W');
        const year = parseInt(yearStr);
        const week = parseInt(weekPart);
        const monday = getFirstDayOfISOWeek(year, week);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        filters.date = {
          $gte: monday,
          $lte: sunday,
        };
      }
    }
    // Month filter (mutually exclusive with week)
    else if (searchParams.get('month')) {
      const months = searchParams.get('month')!.split(',');
      if (months.length > 1) {
        // Multiple months: create $or query with date ranges
        filters.$or = months.map(monthStr => {
          const [year, month] = monthStr.split('-').map(Number);
          const startOfMonth = new Date(year, month - 1, 1);
          const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
          return {
            date: {
              $gte: startOfMonth,
              $lte: endOfMonth,
            },
          };
        });
      } else {
        const [year, month] = searchParams.get('month')!.split('-').map(Number);
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
        filters.date = {
          $gte: startOfMonth,
          $lte: endOfMonth,
        };
      }
    }

    // Year filter (only if no month or week filter)
    if (searchParams.get('year') && !searchParams.get('month') && !searchParams.get('week')) {
      const years = searchParams.get('year')!.split(',').map(y => parseInt(y));
      if (years.length > 1) {
        // Multiple years: create $or query with date ranges
        filters.$or = years.map(year => {
          const startOfYear = new Date(year, 0, 1);
          const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
          return {
            date: {
              $gte: startOfYear,
              $lte: endOfYear,
            },
          };
        });
      } else {
        const year = parseInt(searchParams.get('year')!);
        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
        filters.date = {
          $gte: startOfYear,
          $lte: endOfYear,
        };
      }
    }

    // Supervisor (manager) filter
    if (searchParams.get('manager')) {
      const managers = searchParams.get('manager')!.split(',');
      if (managers.length > 1) {
        filters.supervisor = { $in: managers };
      } else {
        filters.supervisor = searchParams.get('manager');
      }
    }

    // Internal ID filter - partial/contains match (case-insensitive)
    const idSearch = searchParams.get('id');
    if (idSearch) {
      // Search for internalId that contains the search term (case insensitive)
      filters.internalId = { $regex: idSearch, $options: 'i' };
    }

    const submissions = await coll
      .find(filters)
      .sort({ submittedAt: -1 })
      .limit(1000)
      .toArray();

    // Resolve display names for submitters and supervisors
    const submitterInputs = submissions.map((s) => ({
      email: s.submittedBy,
      identifier: s.submittedByIdentifier,
    }));
    const supervisorInputs = submissions.map((s) => ({
      email: s.supervisor,
    }));

    const [submitterNames, supervisorNames] = await Promise.all([
      resolveDisplayNames(submitterInputs),
      resolveDisplayNames(supervisorInputs),
    ]);

    // Transform submissions to include display names and convert ObjectId to string
    const transformedSubmissions = submissions.map((submission) => ({
      _id: submission._id.toString(),
      internalId: submission.internalId,
      status: submission.status,
      supervisor: submission.supervisor,
      date: submission.date,
      hours: submission.hours,
      reason: submission.reason,
      payoutRequest: submission.payoutRequest,
      submittedAt: submission.submittedAt,
      submittedBy: submission.submittedBy,
      submittedByIdentifier: submission.submittedByIdentifier,
      editedAt: submission.editedAt,
      editedBy: submission.editedBy,
      approvedAt: submission.approvedAt,
      approvedBy: submission.approvedBy,
      rejectedAt: submission.rejectedAt,
      rejectedBy: submission.rejectedBy,
      rejectionReason: submission.rejectionReason,
      accountedAt: submission.accountedAt,
      accountedBy: submission.accountedBy,
      editHistory: submission.editHistory,
      // Add display names for convenience
      submittedByName: submitterNames.get(
        submission.submittedByIdentifier || submission.submittedBy,
      ),
      supervisorName: supervisorNames.get(submission.supervisor),
    }));

    return new NextResponse(JSON.stringify(transformedSubmissions));
  } catch (error) {
    console.error('api/overtime-submissions: ' + error);
    return NextResponse.json(
      { error: 'overtime-submissions api' },
      { status: 503 },
    );
  }
}
