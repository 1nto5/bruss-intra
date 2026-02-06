import { dbc } from '@/lib/db/mongo';
import type { Document, Filter } from 'mongodb';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query: Filter<Document> = {};

  searchParams.forEach((value, key) => {
    if (key === 'from' || key === 'to') {
      if (key === 'from') {
        if (!query.from) query.from = {};
        query.from.$gte = new Date(value);
      }
      if (key === 'to') {
        if (!query.to) query.to = {};
        query.to.$lte = new Date(value);
      }
    } else if (key === 'responsible' || key === 'supervisor') {
      query[key] = { $regex: new RegExp(value, 'i') };
    } else {
      query[key] = value;
    }
  });

  try {
    const coll = await dbc('failures_lv');
    const failures = await coll
      .find(query)
      .sort({ _id: -1 })
      .limit(1000)
      .toArray();
    return new NextResponse(JSON.stringify(failures));
  } catch (error) {
    console.error('api/failures/lv: ' + error);
    return NextResponse.json({ error: 'failures/lv api' }, { status: 503 });
  }
}
