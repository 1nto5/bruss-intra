import { auth } from '@/lib/auth';
import { dbc } from '@/lib/db/mongo';
import type { Filter, Document } from 'mongodb';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const roles = session.user?.roles;
  const hasAccess =
    roles?.some(
      (role: string) =>
        role === 'admin' ||
        role === 'hr' ||
        role.includes('group-leader') ||
        role.includes('manager'),
    ) ?? false;
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const searchParams = req.nextUrl.searchParams;
  const query: Filter<Document> = {};
  const userEmail = searchParams.get('userEmail');

  // Exact match filters (for toggle switches "My Orders" and "I Am Responsible")
  if (searchParams.get('requestedBy')) {
    query.requestedBy = searchParams.get('requestedBy');
  }

  if (searchParams.get('responsibleEmployee')) {
    query.responsibleEmployee = searchParams.get('responsibleEmployee');
  }

  // Multi-select filters (for filter dropdowns)
  if (searchParams.get('createdBy')) {
    const createdByValues = searchParams.get('createdBy')!.split(',');
    query.requestedBy =
      createdByValues.length === 1
        ? createdByValues[0]
        : { $in: createdByValues };
  }

  if (searchParams.get('responsiblePerson')) {
    const responsiblePersonValues = searchParams
      .get('responsiblePerson')!
      .split(',');
    query.responsibleEmployee =
      responsiblePersonValues.length === 1
        ? responsiblePersonValues[0]
        : { $in: responsiblePersonValues };
  }

  if (searchParams.get('status')) {
    const statusValues = searchParams.get('status')!.split(',');
    query.status =
      statusValues.length === 1 ? statusValues[0] : { $in: statusValues };
  }

  if (searchParams.get('department')) {
    const departmentValues = searchParams.get('department')!.split(',');
    query.department =
      departmentValues.length === 1
        ? departmentValues[0]
        : { $in: departmentValues };
  }

  searchParams.forEach((value, key) => {
    if (key === 'date') {
      // Create date objects for start and end of the specified date
      const dateValue = new Date(value);
      const startOfDay = new Date(dateValue.setHours(0, 0, 0, 0));
      const endOfDay = new Date(dateValue.setHours(23, 59, 59, 999));

      // Query where 'from' or 'to' falls within the specified date
      query.$or = [
        { from: { $gte: startOfDay, $lte: endOfDay } },
        { to: { $gte: startOfDay, $lte: endOfDay } },
      ];
    }

    if (key === 'id') {
      // Search for internalId that contains the search term (case insensitive)
      query.internalId = { $regex: value, $options: 'i' };
    }
  });

  if (searchParams.has('requestedAt')) {
    const requestedAtValue = new Date(searchParams.get('requestedAt')!);
    const startOfDay = new Date(requestedAtValue);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(requestedAtValue);
    endOfDay.setHours(23, 59, 59, 999);

    // Query where requestedAt falls within the specified date
    query.requestedAt = { $gte: startOfDay, $lte: endOfDay };
  }

  // Year filter: Filter orders where from or to date falls within selected year(s)
  if (searchParams.has('year')) {
    const yearValues = searchParams.get('year')!.split(',');
    const yearConditions = yearValues.map((year) => {
      const yearStart = new Date(parseInt(year), 0, 1, 0, 0, 0, 0);
      const yearEnd = new Date(parseInt(year), 11, 31, 23, 59, 59, 999);

      // Check if overtime period overlaps with year
      return {
        $or: [
          { from: { $gte: yearStart, $lte: yearEnd } },
          { to: { $gte: yearStart, $lte: yearEnd } },
          { $and: [{ from: { $lte: yearStart } }, { to: { $gte: yearEnd } }] },
        ],
      };
    });

    if (yearConditions.length === 1) {
      query.$and = query.$and || [];
      query.$and.push(yearConditions[0]);
    } else {
      query.$and = query.$and || [];
      query.$and.push({ $or: yearConditions });
    }
  }

  // Month filter: Filter orders where from or to date falls within selected month(s)
  if (searchParams.has('month')) {
    const monthValues = searchParams.get('month')!.split(',');
    const monthConditions = monthValues.map((monthValue) => {
      const [year, month] = monthValue.split('-');
      const monthStart = new Date(
        parseInt(year),
        parseInt(month) - 1,
        1,
        0,
        0,
        0,
        0,
      );
      const monthEnd = new Date(
        parseInt(year),
        parseInt(month),
        0,
        23,
        59,
        59,
        999,
      );

      // Check if overtime period overlaps with month
      return {
        $or: [
          { from: { $gte: monthStart, $lte: monthEnd } },
          { to: { $gte: monthStart, $lte: monthEnd } },
          {
            $and: [{ from: { $lte: monthStart } }, { to: { $gte: monthEnd } }],
          },
        ],
      };
    });

    if (monthConditions.length === 1) {
      query.$and = query.$and || [];
      query.$and.push(monthConditions[0]);
    } else {
      query.$and = query.$and || [];
      query.$and.push({ $or: monthConditions });
    }
  }

  // Week filter: Filter orders where from or to date falls within selected ISO week(s)
  if (searchParams.has('week')) {
    const weekValues = searchParams.get('week')!.split(',');

    // Helper function to get Monday of ISO week
    const getFirstDayOfISOWeek = (year: number, week: number): Date => {
      const simple = new Date(year, 0, 1 + (week - 1) * 7);
      const dayOfWeek = simple.getDay();
      const isoWeekStart = new Date(simple);
      if (dayOfWeek <= 4) {
        isoWeekStart.setDate(simple.getDate() - simple.getDay() + 1);
      } else {
        isoWeekStart.setDate(simple.getDate() + 8 - simple.getDay());
      }
      return isoWeekStart;
    };

    const weekConditions = weekValues.map((weekValue) => {
      const [year, weekPart] = weekValue.split('-W');
      const weekNum = parseInt(weekPart);
      const monday = getFirstDayOfISOWeek(parseInt(year), weekNum);
      const weekStart = new Date(monday);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(monday);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // Check if overtime period overlaps with week
      return {
        $or: [
          { from: { $gte: weekStart, $lte: weekEnd } },
          { to: { $gte: weekStart, $lte: weekEnd } },
          { $and: [{ from: { $lte: weekStart } }, { to: { $gte: weekEnd } }] },
        ],
      };
    });

    if (weekConditions.length === 1) {
      query.$and = query.$and || [];
      query.$and.push(weekConditions[0]);
    } else {
      query.$and = query.$and || [];
      query.$and.push({ $or: weekConditions });
    }
  }

  // Add condition to only show draft documents that belong to the current user
  if (userEmail) {
    // Either status is not draft OR (status is draft AND requestedBy equals userEmail)
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { status: { $ne: 'draft' } },
        { $and: [{ status: 'draft' }, { requestedBy: userEmail }] },
      ],
    });
  }

  try {
    const coll = await dbc('overtime_orders');
    const failures = await coll
      .find(query)
      .sort({ _id: -1 })
      .limit(1000)
      .toArray();
    return new NextResponse(JSON.stringify(failures));
  } catch (error) {
    console.error('api/overtime-orders: ' + error);
    return NextResponse.json({ error: 'overtime-orders api' }, { status: 503 });
  }
}
