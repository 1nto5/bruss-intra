import { auth } from '@/lib/auth';
import { dbc } from '@/lib/db/mongo';
import { extractNameFromEmail } from '@/lib/utils/name-format';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export type EmployeeBalanceType = {
  email: string;
  name: string;
  totalHours: number;
  entryCount: number;
  pendingCount: number;
  approvedCount: number;
  latestSupervisor: string;
  latestSupervisorName: string;
};

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const userEmail = session.user.email;
  const userRoles = session.user.roles ?? [];

  // Check permissions
  const isAdmin = userRoles.includes('admin');
  const isHR = userRoles.includes('hr');
  const isPlantManager = userRoles.includes('plant-manager');
  const isManager = userRoles.some(
    (role: string) =>
      role.toLowerCase().includes('manager') ||
      role.toLowerCase().includes('group-leader'),
  );

  // Only managers, HR, admin, plant-manager can access this endpoint
  if (!isManager && !isHR && !isAdmin && !isPlantManager) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

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

    // Year filter
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

    // Month filter
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
      // Filter out zero balance employees
      { $match: { totalHours: { $ne: 0 } } },
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
    const balances: EmployeeBalanceType[] = filteredResults.map(
      (item: Record<string, unknown>) => ({
        email: item._id as string,
        name: extractNameFromEmail(item._id as string),
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

    return NextResponse.json(balances);
  } catch (error) {
    console.error('api/overtime-submissions/balances: ' + error);
    return NextResponse.json(
      { error: 'balances api error' },
      { status: 503 },
    );
  }
}
