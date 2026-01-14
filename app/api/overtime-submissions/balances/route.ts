import { dbc } from '@/lib/db/mongo';
import { extractNameFromEmail } from '@/lib/utils/name-format';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export type EmployeeBalanceType = {
  email: string;
  name: string;
  userId: string;
  totalHours: number;
  entryCount: number;
  pendingCount: number;
  approvedCount: number;
  latestSupervisor: string;
  latestSupervisorName: string;
};

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

  try {
    const coll = await dbc('overtime_submissions');
    const searchParams = req.nextUrl.searchParams;

    // Build match stage based on filters
    const matchStage: Record<string, unknown> = {};

    // Status filter - if provided, filter by specific statuses
    // Default: show all non-cancelled statuses
    const statusParam = searchParams.get('status');
    if (statusParam) {
      const statuses = statusParam.split(',');
      matchStage.status = { $in: statuses };
    } else {
      // Exclude cancelled by default
      matchStage.status = { $ne: 'cancelled' };
    }

    // Exclude "zlecenia" (orders with payment or scheduledDayOff)
    matchStage.payment = { $ne: true };
    matchStage.scheduledDayOff = { $exists: false };

    // Week filter (takes precedence over month)
    const weekParam = searchParams.get('week');
    if (weekParam) {
      const weeks = weekParam.split(',');

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

      if (weeks.length === 1) {
        const [yearStr, weekPart] = weeks[0].split('-W');
        const year = parseInt(yearStr);
        const week = parseInt(weekPart);
        const monday = getFirstDayOfISOWeek(year, week);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        matchStage.date = {
          $gte: monday,
          $lte: sunday,
        };
      } else {
        matchStage.$or = weeks.map((weekStr) => {
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
      }
    }
    // Month filter (only if no week filter)
    else {
      const monthParam = searchParams.get('month');
      if (monthParam) {
        const months = monthParam.split(',');
        if (months.length === 1) {
          const [year, month] = months[0].split('-').map(Number);
          matchStage.date = {
            $gte: new Date(year, month - 1, 1),
            $lte: new Date(year, month, 0, 23, 59, 59, 999),
          };
        } else {
          matchStage.$or = months.map((monthStr) => {
            const [year, month] = monthStr.split('-').map(Number);
            return {
              date: {
                $gte: new Date(year, month - 1, 1),
                $lte: new Date(year, month, 0, 23, 59, 59, 999),
              },
            };
          });
        }
      }
      // Year filter (only if no month or week filter)
      else {
        const yearParam = searchParams.get('year');
        if (yearParam) {
          const years = yearParam.split(',').map((y) => parseInt(y));
          if (years.length === 1) {
            const year = years[0];
            matchStage.date = {
              $gte: new Date(year, 0, 1),
              $lte: new Date(year, 11, 31, 23, 59, 59, 999),
            };
          } else {
            matchStage.$or = years.map((year) => ({
              date: {
                $gte: new Date(year, 0, 1),
                $lte: new Date(year, 11, 31, 23, 59, 59, 999),
              },
            }));
          }
        }
      }
    }

    // Aggregation pipeline
    const pipeline = [
      { $match: matchStage },
      { $sort: { submittedAt: -1 } },
      {
        $group: {
          _id: '$submittedBy',
          totalHours: { $sum: '$hours' },
          entryCount: { $sum: 1 },
          latestSupervisor: { $first: '$supervisor' },
          pendingCount: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$status', 'pending'] },
                    { $eq: ['$status', 'pending-plant-manager'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          approvedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] },
          },
        },
      },
      // Lookup user info to get userId
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'email',
          as: 'userInfo',
        },
      },
      {
        $addFields: {
          userId: { $toString: { $arrayElemAt: ['$userInfo._id', 0] } },
        },
      },
      {
        $project: {
          userInfo: 0,
        },
      },
      // Sort by total hours (highest first, then negative)
      { $sort: { totalHours: -1 } },
    ];

    const aggregationResult = await coll
      .aggregate(pipeline)
      .toArray();

    // Filter by role: supervisors only see their employees
    let filteredResults = aggregationResult;
    if (!isAdmin && !isHR && !isPlantManager) {
      // Regular manager/supervisor: only see employees they supervise
      filteredResults = aggregationResult.filter(
        (item: Record<string, unknown>) => item.latestSupervisor === userEmail,
      );
    }

    // Employee filter (multi-select)
    const employeeParam = searchParams.get('employee');
    if (employeeParam) {
      const employees = employeeParam.split(',');
      filteredResults = filteredResults.filter(
        (item: Record<string, unknown>) => employees.includes(item._id as string),
      );
    }

    // Supervisor filter (for HR/Admin/PM)
    const supervisorParam = searchParams.get('supervisor');
    if (supervisorParam && (isAdmin || isHR || isPlantManager)) {
      const supervisors = supervisorParam.split(',');
      filteredResults = filteredResults.filter(
        (item: Record<string, unknown>) =>
          supervisors.includes(item.latestSupervisor as string),
      );
    }

    // Transform to response format
    let balances: EmployeeBalanceType[] = filteredResults.map(
      (item: Record<string, unknown>) => ({
        email: item._id as string,
        name: extractNameFromEmail(item._id as string),
        userId: (item.userId as string) || '',
        totalHours: item.totalHours as number,
        entryCount: item.entryCount as number,
        pendingCount: item.pendingCount as number,
        approvedCount: item.approvedCount as number,
        latestSupervisor: item.latestSupervisor as string,
        latestSupervisorName: extractNameFromEmail(
          item.latestSupervisor as string,
        ),
      }),
    );

    // Name filter (case-insensitive search on employee name)
    const nameParam = searchParams.get('name');
    if (nameParam) {
      const nameRegex = new RegExp(nameParam, 'i');
      balances = balances.filter((b) => nameRegex.test(b.name));
    }

    return NextResponse.json(balances);
  } catch (error) {
    console.error('api/overtime-submissions/balances: ' + error);
    return NextResponse.json(
      { error: 'balances api error' },
      { status: 503 },
    );
  }
}
