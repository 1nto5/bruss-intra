import { dbc } from '@/lib/db/mongo';
import { NextResponse, type NextRequest } from 'next/server';

// Cache for 60 seconds, use revalidateTag('deviations') for on-demand invalidation
export const revalidate = 60;

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query: any = {};

  if (searchParams.get('owner')) {
    query.owner = searchParams.get('owner');
  }

  searchParams.forEach((value, key) => {
    if (key === 'date') {
      // Create date objects for start and end of the specified date
      const dateValue = new Date(value);
      const startOfDay = new Date(dateValue.setHours(0, 0, 0, 0));
      const endOfDay = new Date(dateValue.setHours(23, 59, 59, 999));

      // Query where date falls within the specified range
      query.$or = [
        { 'timePeriod.from': { $gte: startOfDay, $lte: endOfDay } },
        { 'timePeriod.to': { $gte: startOfDay, $lte: endOfDay } },
      ];
    }

    if (key === 'status') {
      query.status = value;
    }

    // Add handling for 'area' and 'reason'
    if (key === 'area') {
      query.area = value;
    }

    if (key === 'reason') {
      query.reason = value;
    }

    if (key === 'id') {
      query.internalId = { $regex: value, $options: 'i' };
    }
  });

  if (searchParams.has('createdAt')) {
    const createdAtValue = new Date(searchParams.get('createdAt')!);
    const startOfDay = new Date(createdAtValue);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(createdAtValue);
    endOfDay.setHours(23, 59, 59, 999);

    // Query where createdAt falls within the specified date
    query.createdAt = { $gte: startOfDay, $lte: endOfDay };
  }

  try {
    const coll = await dbc('deviations');
    const deviations = await coll
      .find(query)
      .sort({ createdAt: -1 })
      .limit(1000)
      .toArray();
    return new NextResponse(JSON.stringify(deviations));
  } catch (error) {
    console.error('api/deviations/get-deviations: ' + error);
    return NextResponse.json({ error: 'get-deviations api' }, { status: 503 });
  }
}
