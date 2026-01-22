import { checkIfUserIsSupervisor } from '@/lib/data/check-user-supervisor-status';
import { dbc } from '@/lib/db/mongo';
import { extractNameFromEmail } from '@/lib/utils/name-format';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const userEmail = searchParams.get('userEmail');
  const userRoles = searchParams.get('userRoles')?.split(',') || [];

  // Check permissions
  const isAdmin = userRoles.includes('admin');
  const isHR = userRoles.includes('hr');
  const isPlantManager = userRoles.includes('plant-manager');
  const isManager = userRoles.some(
    (role: string) =>
      role.toLowerCase().includes('manager') ||
      role.toLowerCase().includes('group-leader'),
  );

  // Check access: role-based or supervisor-based
  let hasAccess = isManager || isHR || isAdmin || isPlantManager;
  if (!hasAccess && userEmail) {
    hasAccess = await checkIfUserIsSupervisor(userEmail);
  }
  if (!hasAccess) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
  }

  try {
    const coll = await dbc('overtime_submissions');

    // Build base query based on user permissions
    const filters: Record<string, unknown> = {};

    // Role-based filtering: HR/Admin/PM see all, others see only supervised entries
    if (!isAdmin && !isHR && !isPlantManager) {
      filters.supervisor = userEmail;
    }

    // "Requires my approval" filter
    if (searchParams.get('requiresMyApproval') === 'true') {
      // Show pending entries where user is the supervisor
      filters.status = 'pending';
      filters.supervisor = userEmail;
    }

    // "Not settled" filter (HR/Admin only) - shows non-accounted entries
    if (searchParams.get('notSettled') === 'true' && (isAdmin || isHR)) {
      filters.status = { $ne: 'accounted' };
    }

    // Status filter
    const statusParam = searchParams.get('status');
    if (statusParam) {
      const statuses = statusParam.split(',');
      if (statuses.length > 1) {
        filters.status = { $in: statuses };
      } else {
        filters.status = statusParam;
      }
    }

    // Employee filter
    const employeeParam = searchParams.get('employee');
    if (employeeParam) {
      const employees = employeeParam.split(',');
      if (employees.length > 1) {
        filters.submittedBy = { $in: employees };
      } else {
        filters.submittedBy = employeeParam;
      }
    }

    // Supervisor filter (for HR/Admin/PM only)
    const supervisorParam = searchParams.get('supervisor');
    if (supervisorParam && (isAdmin || isHR || isPlantManager)) {
      const supervisors = supervisorParam.split(',');
      if (supervisors.length > 1) {
        filters.supervisor = { $in: supervisors };
      } else {
        filters.supervisor = supervisorParam;
      }
    }

    // Internal ID filter
    const idSearch = searchParams.get('id');
    if (idSearch) {
      filters.internalId = { $regex: idSearch, $options: 'i' };
    }

    // Week filter (takes precedence over month)
    const weekParam = searchParams.get('week');
    if (weekParam) {
      const weeks = weekParam.split(',');

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

      if (weeks.length === 1) {
        const [yearStr, weekPart] = weeks[0].split('-W');
        const year = parseInt(yearStr);
        const week = parseInt(weekPart);
        const monday = getFirstDayOfISOWeek(year, week);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        filters.date = { $gte: monday, $lte: sunday };
      } else {
        const existingOr = filters.$or as unknown[] | undefined;
        const weekConditions = weeks.map((weekStr) => {
          const [yearStr, weekPart] = weekStr.split('-W');
          const year = parseInt(yearStr);
          const week = parseInt(weekPart);
          const monday = getFirstDayOfISOWeek(year, week);
          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);
          sunday.setHours(23, 59, 59, 999);
          return { date: { $gte: monday, $lte: sunday } };
        });
        if (existingOr) {
          filters.$and = [...(filters.$and as unknown[] || []), { $or: weekConditions }];
        } else {
          filters.$or = weekConditions;
        }
      }
    }
    // Month filter (only if no week filter)
    else {
      const monthParam = searchParams.get('month');
      if (monthParam) {
        const months = monthParam.split(',');
        if (months.length === 1) {
          const [year, month] = months[0].split('-').map(Number);
          filters.date = {
            $gte: new Date(year, month - 1, 1),
            $lte: new Date(year, month, 0, 23, 59, 59, 999),
          };
        } else {
          const existingOr = filters.$or as unknown[] | undefined;
          const monthConditions = months.map((monthStr) => {
            const [year, month] = monthStr.split('-').map(Number);
            return {
              date: {
                $gte: new Date(year, month - 1, 1),
                $lte: new Date(year, month, 0, 23, 59, 59, 999),
              },
            };
          });
          if (existingOr) {
            filters.$and = [...(filters.$and as unknown[] || []), { $or: monthConditions }];
          } else {
            filters.$or = monthConditions;
          }
        }
      }
      // Year filter (only if no month or week filter)
      else {
        const yearParam = searchParams.get('year');
        if (yearParam) {
          const years = yearParam.split(',').map((y) => parseInt(y));
          if (years.length === 1) {
            const year = years[0];
            filters.date = {
              $gte: new Date(year, 0, 1),
              $lte: new Date(year, 11, 31, 23, 59, 59, 999),
            };
          } else {
            const existingOr = filters.$or as unknown[] | undefined;
            const yearConditions = years.map((year) => ({
              date: {
                $gte: new Date(year, 0, 1),
                $lte: new Date(year, 11, 31, 23, 59, 59, 999),
              },
            }));
            if (existingOr) {
              filters.$and = [...(filters.$and as unknown[] || []), { $or: yearConditions }];
            } else {
              filters.$or = yearConditions;
            }
          }
        }
      }
    }

    const submissions = await coll
      .find(filters)
      .sort({ submittedAt: -1 })
      .limit(1000)
      .toArray();

    // Transform submissions
    const transformedSubmissions = submissions.map((submission) => ({
      _id: submission._id.toString(),
      internalId: submission.internalId,
      status: submission.status,
      supervisor: submission.supervisor,
      date: submission.date,
      hours: submission.hours,
      reason: submission.reason,
      submittedAt: submission.submittedAt,
      submittedBy: submission.submittedBy,
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
      submittedByName: extractNameFromEmail(submission.submittedBy),
      supervisorName: extractNameFromEmail(submission.supervisor),
    }));

    return new NextResponse(JSON.stringify(transformedSubmissions));
  } catch (error) {
    console.error('api/overtime-submissions/all: ' + error);
    return NextResponse.json(
      { error: 'all entries api error' },
      { status: 503 },
    );
  }
}
