import { checkIfUserIsSupervisor } from '@/lib/data/check-user-supervisor-status';
import { dbc } from '@/lib/db/mongo';
import { extractNameFromEmail } from '@/lib/utils/name-format';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export type EmployeeBalanceType = {
  email: string;
  name: string;
  userId: string;
  allTimeBalance: number; // cumulative balance from all time
  allTimePendingHours: number; // pending hours from all time
  periodHours: number; // hours within filtered period only
  periodPendingHours: number; // pending hours within filtered period
  entryCount: number;
  pendingCount: number;
  approvedCount: number;
  unaccountedCount: number;
  unaccountedOvertime: number; // approved, payment=false, no scheduledDayOff
  unaccountedPayment: number; // approved, payment=true
  unaccountedScheduled: number; // approved, scheduledDayOff set, payment=false
  latestSupervisor: string;
  latestSupervisorName: string;
  pendingSupervisors: string[]; // All supervisors with pending entries for this employee
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
    const searchParams = req.nextUrl.searchParams;

    // Build match stage based on filters
    const matchStage: Record<string, unknown> = {};

    // Status filter - if provided, filter by specific statuses
    // Default: exclude cancelled and rejected (they shouldn't affect balances)
    const statusParam = searchParams.get('status');
    if (statusParam) {
      const statuses = statusParam.split(',');
      matchStage.status = { $in: statuses };
    } else {
      // Exclude cancelled and rejected by default
      matchStage.status = { $nin: ['cancelled', 'rejected'] };
    }

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

    // All-time balance pipeline (no date filter, only status filter)
    const allTimeMatchStage: Record<string, unknown> = {
      status: { $nin: ['cancelled', 'rejected'] },
    };

    const allTimePipeline = [
      { $match: allTimeMatchStage },
      {
        $group: {
          _id: '$submittedBy',
          allTimeBalance: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$payment', true] },
                    { $not: { $ifNull: ['$scheduledDayOff', false] } },
                    {
                      $not: {
                        $in: ['$status', ['pending', 'pending-plant-manager']],
                      },
                    },
                  ],
                },
                '$hours',
                0,
              ],
            },
          },
          allTimePendingHours: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$payment', true] },
                    { $not: { $ifNull: ['$scheduledDayOff', false] } },
                    { $in: ['$status', ['pending', 'pending-plant-manager']] },
                  ],
                },
                '$hours',
                0,
              ],
            },
          },
        },
      },
    ];

    // Period-specific pipeline
    const periodPipeline = [
      { $match: matchStage },
      { $sort: { submittedAt: -1 } },
      {
        $group: {
          _id: '$submittedBy',
          periodHours: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$payment', true] },
                    { $not: { $ifNull: ['$scheduledDayOff', false] } },
                    {
                      $not: {
                        $in: ['$status', ['pending', 'pending-plant-manager']],
                      },
                    },
                  ],
                },
                '$hours',
                0,
              ],
            },
          },
          periodPendingHours: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$payment', true] },
                    { $not: { $ifNull: ['$scheduledDayOff', false] } },
                    { $in: ['$status', ['pending', 'pending-plant-manager']] },
                  ],
                },
                '$hours',
                0,
              ],
            },
          },
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
          unaccountedCount: {
            $sum: {
              $cond: [
                {
                  $in: [
                    '$status',
                    ['pending', 'pending-plant-manager', 'approved'],
                  ],
                },
                1,
                0,
              ],
            },
          },
          unaccountedOvertime: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'approved'] },
                    { $ne: ['$payment', true] },
                    { $not: { $ifNull: ['$scheduledDayOff', false] } },
                  ],
                },
                1,
                0,
              ],
            },
          },
          unaccountedPayment: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'approved'] },
                    { $eq: ['$payment', true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          unaccountedScheduled: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'approved'] },
                    { $ne: ['$payment', true] },
                    { $ifNull: ['$scheduledDayOff', false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          pendingSupervisors: {
            $addToSet: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$status', 'pending'] },
                    { $eq: ['$status', 'pending-plant-manager'] },
                  ],
                },
                '$supervisor',
                '$$REMOVE',
              ],
            },
          },
        },
      },
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
      { $project: { userInfo: 0 } },
      { $sort: { periodHours: -1 } },
    ];

    // Run both aggregations
    const [allTimeResults, periodResults] = await Promise.all([
      coll.aggregate(allTimePipeline).toArray(),
      coll.aggregate(periodPipeline).toArray(),
    ]);

    // Create lookup map for all-time data
    const allTimeMap = new Map(
      allTimeResults.map((r) => [
        r._id,
        { allTimeBalance: r.allTimeBalance, allTimePendingHours: r.allTimePendingHours },
      ]),
    );

    // Merge results
    const aggregationResult = periodResults.map((item) => ({
      ...item,
      allTimeBalance: allTimeMap.get(item._id)?.allTimeBalance || 0,
      allTimePendingHours: allTimeMap.get(item._id)?.allTimePendingHours || 0,
    }));

    // Filter by role: supervisors only see their employees
    let filteredResults = aggregationResult;
    if (!isAdmin && !isHR && !isPlantManager) {
      // Regular manager/supervisor: see employees where they are:
      // 1. The latest supervisor (current responsibility), OR
      // 2. Have pending entries assigned to them (old responsibility)
      filteredResults = aggregationResult.filter(
        (item: Record<string, unknown>) =>
          item.latestSupervisor === userEmail ||
          (item.pendingSupervisors as string[])?.includes(userEmail as string),
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
        allTimeBalance: (item.allTimeBalance as number) || 0,
        allTimePendingHours: (item.allTimePendingHours as number) || 0,
        periodHours: (item.periodHours as number) || 0,
        periodPendingHours: (item.periodPendingHours as number) || 0,
        entryCount: item.entryCount as number,
        pendingCount: item.pendingCount as number,
        approvedCount: item.approvedCount as number,
        unaccountedCount: item.unaccountedCount as number,
        unaccountedOvertime: (item.unaccountedOvertime as number) || 0,
        unaccountedPayment: (item.unaccountedPayment as number) || 0,
        unaccountedScheduled: (item.unaccountedScheduled as number) || 0,
        latestSupervisor: item.latestSupervisor as string,
        latestSupervisorName: extractNameFromEmail(
          item.latestSupervisor as string,
        ),
        pendingSupervisors: (item.pendingSupervisors as string[]) || [],
      }),
    );

    // Name filter (case-insensitive search on employee name)
    const nameParam = searchParams.get('name');
    if (nameParam) {
      const nameRegex = new RegExp(nameParam, 'i');
      balances = balances.filter((b) => nameRegex.test(b.name));
    }

    // Sort alphabetically by surname (part after ". " in "A. Surname" format)
    balances.sort((a, b) => {
      const surnameA = a.name.split('. ')[1] || a.name;
      const surnameB = b.name.split('. ')[1] || b.name;
      return surnameA.localeCompare(surnameB, 'pl');
    });

    return NextResponse.json(balances);
  } catch (error) {
    console.error('api/overtime-submissions/balances: ' + error);
    return NextResponse.json(
      { error: 'balances api error' },
      { status: 503 },
    );
  }
}
