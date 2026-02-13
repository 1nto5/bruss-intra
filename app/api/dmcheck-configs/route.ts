import { dbc } from '@/lib/db/mongo';
import type { Filter, Document } from 'mongodb';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const userRoles = searchParams.get('userRoles')?.split(',') || [];

  try {
    const isAdmin = userRoles.includes('admin');
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'unauthorized' },
        { status: 403 },
      );
    }

    const coll = await dbc('dmcheck_configs');
    const filters: Filter<Document> = {};

    const workplace = searchParams.get('workplace');
    if (workplace) {
      filters.workplace = { $in: workplace.split(',') };
    }

    const search = searchParams.get('search');
    if (search) {
      const regex = { $regex: search, $options: 'i' };
      filters.$or = [{ articleNumber: regex }, { articleName: regex }];
    }

    const configs = await coll
      .find(filters)
      .sort({ workplace: 1, articleNumber: 1 })
      .toArray();

    const data = configs.map((c) => ({
      ...c,
      _id: c._id.toString(),
    }));

    return new NextResponse(JSON.stringify(data));
  } catch (error) {
    console.error('api/dmcheck-configs: ' + error);
    return NextResponse.json(
      { error: 'dmcheck-configs api' },
      { status: 503 },
    );
  }
}
