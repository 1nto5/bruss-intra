import { auth } from '@/lib/auth';
import { dbc } from '@/lib/db/mongo';
import { hasOvertimeViewAccess } from '@/app/[lang]/overtime-orders/lib/overtime-roles';
import type { Filter, Document } from 'mongodb';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasOvertimeViewAccess(session.user?.roles)) {
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

  // Helper: build an overlap condition for a date range against from/to fields
  function overlapCondition(start: Date, end: Date) {
    return {
      $or: [
        { from: { $gte: start, $lte: end } },
        { to: { $gte: start, $lte: end } },
        { $and: [{ from: { $lte: start } }, { to: { $gte: end } }] },
      ],
    };
  }

  // Helper: push one or many conditions into $and
  function addDateFilter(conditions: object[]) {
    query.$and = query.$and || [];
    query.$and.push(
      conditions.length === 1 ? conditions[0] : { $or: conditions },
    );
  }

  // Year filter
  if (searchParams.has('year')) {
    const yearConditions = searchParams.get('year')!.split(',').map((year) => {
      const y = parseInt(year);
      return overlapCondition(
        new Date(y, 0, 1, 0, 0, 0, 0),
        new Date(y, 11, 31, 23, 59, 59, 999),
      );
    });
    addDateFilter(yearConditions);
  }

  // Month filter
  if (searchParams.has('month')) {
    const monthConditions = searchParams.get('month')!.split(',').map((monthValue) => {
      const [year, month] = monthValue.split('-');
      return overlapCondition(
        new Date(parseInt(year), parseInt(month) - 1, 1, 0, 0, 0, 0),
        new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999),
      );
    });
    addDateFilter(monthConditions);
  }

  // Week filter (ISO weeks)
  if (searchParams.has('week')) {
    function getFirstDayOfISOWeek(year: number, week: number): Date {
      const simple = new Date(year, 0, 1 + (week - 1) * 7);
      const isoWeekStart = new Date(simple);
      if (simple.getDay() <= 4) {
        isoWeekStart.setDate(simple.getDate() - simple.getDay() + 1);
      } else {
        isoWeekStart.setDate(simple.getDate() + 8 - simple.getDay());
      }
      return isoWeekStart;
    }

    const weekConditions = searchParams.get('week')!.split(',').map((weekValue) => {
      const [year, weekPart] = weekValue.split('-W');
      const monday = getFirstDayOfISOWeek(parseInt(year), parseInt(weekPart));
      const weekStart = new Date(monday);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(monday);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      return overlapCondition(weekStart, weekEnd);
    });
    addDateFilter(weekConditions);
  }

  // Only show draft documents that belong to the current user
  if (userEmail) {
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
    const orders = await coll
      .find(query)
      .sort({ _id: -1 })
      .limit(1000)
      .toArray();
    return NextResponse.json(orders);
  } catch (error) {
    console.error('api/overtime-orders: ' + error);
    return NextResponse.json({ error: 'overtime-orders api' }, { status: 503 });
  }
}
