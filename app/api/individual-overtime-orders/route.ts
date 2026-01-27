import { auth } from '@/lib/auth';
import { dbc } from '@/lib/db/mongo';
import {
  resolveDisplayNames,
  resolveEmployeeNames,
} from '@/lib/utils/name-resolver';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userEmail = session.user.email;
  const userRoles = session.user.roles ?? [];
  const searchParams = req.nextUrl.searchParams;

  try {
    const coll = await dbc('individual_overtime_orders');

    // Get user roles
    const isManager = userRoles.some(
      (role: string) =>
        role.toLowerCase().includes('manager') ||
        role.toLowerCase().includes('leader'),
    );
    const isAdmin = userRoles.includes('admin');
    const isHR = userRoles.includes('hr');

    // Build base query based on user permissions
    let baseQuery: any = {};

    if (isAdmin || isHR) {
      // Admins and HR can see all orders
      baseQuery = {};
    } else if (isManager) {
      // Managers can see orders they created (they are supervisors)
      baseQuery = { supervisor: userEmail };
    } else {
      // Non-managers - no access to this endpoint
      return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
    }

    // Apply filters from search parameters
    const filters: any = { ...baseQuery };

    // Pending settlements filter - for HR/Admin only
    if (
      searchParams.get('pendingSettlements') === 'true' &&
      (isAdmin || isHR)
    ) {
      filters.status = 'approved';
      delete filters.supervisor;
    } else {
      // Pending approvals filter
      if (searchParams.get('pendingApprovals') === 'true') {
        filters.status = { $in: ['pending', 'pending-plant-manager'] };
      }
    }

    // Employee filter (by identifier)
    if (searchParams.get('employee')) {
      const employees = searchParams.get('employee')!.split(',');
      if (employees.length > 1) {
        filters.employeeIdentifier = { $in: employees };
      } else {
        filters.employeeIdentifier = searchParams.get('employee');
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

    // Year filter
    if (
      searchParams.get('year') &&
      !searchParams.get('month') &&
      !searchParams.get('week')
    ) {
      const years = searchParams
        .get('year')!
        .split(',')
        .map((y) => parseInt(y));
      if (years.length > 1) {
        filters.$or = years.map((year) => ({
          workStartTime: {
            $gte: new Date(year, 0, 1),
            $lte: new Date(year, 11, 31, 23, 59, 59, 999),
          },
        }));
      } else {
        const year = years[0];
        filters.workStartTime = {
          $gte: new Date(year, 0, 1),
          $lte: new Date(year, 11, 31, 23, 59, 59, 999),
        };
      }
    }

    // Month filter
    if (searchParams.get('month')) {
      const months = searchParams.get('month')!.split(',');
      if (months.length > 1) {
        filters.$or = months.map((monthStr) => {
          const [year, month] = monthStr.split('-').map(Number);
          return {
            workStartTime: {
              $gte: new Date(year, month - 1, 1),
              $lte: new Date(year, month, 0, 23, 59, 59, 999),
            },
          };
        });
      } else {
        const [year, month] = searchParams.get('month')!.split('-').map(Number);
        filters.workStartTime = {
          $gte: new Date(year, month - 1, 1),
          $lte: new Date(year, month, 0, 23, 59, 59, 999),
        };
      }
    }

    // Week filter (ISO week)
    if (searchParams.get('week')) {
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

      const weeks = searchParams.get('week')!.split(',');
      if (weeks.length > 1) {
        filters.$or = weeks.map((weekStr) => {
          const [yearStr, weekPart] = weekStr.split('-W');
          const year = parseInt(yearStr);
          const week = parseInt(weekPart);
          const monday = getFirstDayOfISOWeek(year, week);
          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);
          sunday.setHours(23, 59, 59, 999);
          return {
            workStartTime: {
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
        filters.workStartTime = {
          $gte: monday,
          $lte: sunday,
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

    // Internal ID filter
    const idSearch = searchParams.get('id');
    if (idSearch) {
      filters.internalId = { $regex: idSearch, $options: 'i' };
    }

    const orders = await coll
      .find(filters)
      .sort({ submittedAt: -1 })
      .limit(1000)
      .toArray();

    // Collect unique employee identifiers and supervisor emails
    const employeeIdentifiers = [
      ...new Set(orders.map((o) => o.employeeIdentifier).filter(Boolean)),
    ];
    const supervisorInputs = orders.map((o) => ({
      email: o.supervisor,
    }));

    // Resolve names in parallel
    const [employeeNames, supervisorNames] = await Promise.all([
      resolveEmployeeNames(employeeIdentifiers),
      resolveDisplayNames(supervisorInputs),
    ]);

    // Transform orders to include display names
    const transformedOrders = orders.map((order) => ({
      _id: order._id.toString(),
      internalId: order.internalId,
      employeeIdentifier: order.employeeIdentifier,
      employeeEmail: order.employeeEmail,
      employeeName: employeeNames.get(order.employeeIdentifier) || 'Unknown',
      supervisor: order.supervisor,
      supervisorName: supervisorNames.get(order.supervisor),
      status: order.status,
      hours: order.hours,
      reason: order.reason,
      payment: order.payment,
      scheduledDayOff: order.scheduledDayOff,
      workStartTime: order.workStartTime,
      workEndTime: order.workEndTime,
      submittedAt: order.submittedAt,
      submittedBy: order.submittedBy,
      createdBy: order.createdBy,
      editedAt: order.editedAt,
      editedBy: order.editedBy,
      approvedAt: order.approvedAt,
      approvedBy: order.approvedBy,
      rejectedAt: order.rejectedAt,
      rejectedBy: order.rejectedBy,
      rejectionReason: order.rejectionReason,
      accountedAt: order.accountedAt,
      accountedBy: order.accountedBy,
      cancelledAt: order.cancelledAt,
      cancelledBy: order.cancelledBy,
      cancellationReason: order.cancellationReason,
      supervisorApprovedAt: order.supervisorApprovedAt,
      supervisorApprovedBy: order.supervisorApprovedBy,
      plantManagerApprovedAt: order.plantManagerApprovedAt,
      plantManagerApprovedBy: order.plantManagerApprovedBy,
      correctionHistory: order.correctionHistory,
    }));

    return new NextResponse(JSON.stringify(transformedOrders));
  } catch (error) {
    console.error('api/individual-overtime-orders: ' + error);
    return NextResponse.json(
      { error: 'individual-overtime-orders api' },
      { status: 503 },
    );
  }
}
