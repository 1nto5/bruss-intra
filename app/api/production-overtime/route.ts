import { dbc } from '@/lib/db/mongo';
import type { Filter, Document } from 'mongodb';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query: Filter<Document> = {};
  const userEmail = searchParams.get('userEmail');

  if (searchParams.get('requestedBy')) {
    query.requestedBy = searchParams.get('requestedBy');
  }

  if (searchParams.get('responsibleEmployee')) {
    query.responsibleEmployee = searchParams.get('responsibleEmployee');
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

    if (key === 'status') {
      query.status = value;
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
    const coll = await dbc('production_overtime');
    const failures = await coll
      .find(query)
      .sort({ _id: -1 })
      .limit(1000)
      .toArray();
    return new NextResponse(JSON.stringify(failures));
  } catch (error) {
    console.error('api/production-overtime: ' + error);
    return NextResponse.json(
      { error: 'production-overtime api' },
      { status: 503 },
    );
  }
}
