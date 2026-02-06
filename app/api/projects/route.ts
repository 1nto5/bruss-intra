import { dbc } from '@/lib/db/mongo';
import type { Filter, Document } from 'mongodb';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query: Filter<Document> = {};

  searchParams.forEach((value, key) => {
    if (key === 'date') {
      query.date = new Date(value);
    }
  });

  try {
    const coll = await dbc('projects');
    const failures = await coll
      .find(query)
      .sort({ _id: -1 })
      .limit(1000)
      .toArray();
    return new NextResponse(JSON.stringify(failures));
  } catch (error) {
    console.error('api/projects: ' + error);
    return NextResponse.json({ error: 'projects api' }, { status: 503 });
  }
}
