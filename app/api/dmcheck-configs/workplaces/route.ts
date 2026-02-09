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
    const workplaces: string[] = await coll.distinct('workplace');

    workplaces.sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    );

    return NextResponse.json(workplaces);
  } catch (error) {
    console.error('api/dmcheck-configs/workplaces: ' + error);
    return NextResponse.json(
      { error: 'dmcheck-configs workplaces api' },
      { status: 503 },
    );
  }
}
