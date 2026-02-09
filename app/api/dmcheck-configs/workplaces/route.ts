import { dbc } from '@/lib/db/mongo';
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
    const result = await coll
      .aggregate<{ _id: string }>([
        { $group: { _id: '$workplace' } },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    const workplaces = result.map((r) => r._id);

    return NextResponse.json(workplaces);
  } catch (error) {
    console.error('api/dmcheck-configs/workplaces: ' + error);
    return NextResponse.json(
      { error: 'dmcheck-configs workplaces api' },
      { status: 503 },
    );
  }
}
