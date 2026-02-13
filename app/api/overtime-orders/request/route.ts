import { auth } from '@/lib/auth';
import { dbc } from '@/lib/db/mongo';
import { hasOvertimeViewAccess } from '@/app/[lang]/overtime-orders/lib/overtime-roles';
import { ObjectId } from 'mongodb';
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

  // Check if ID is provided
  if (!searchParams.has('id')) {
    return NextResponse.json(
      { error: 'ID parameter is required' },
      { status: 400 },
    );
  }

  try {
    const id = searchParams.get('id')!;
    const query = { _id: new ObjectId(id) };

    const coll = await dbc('overtime_orders');
    const document = await coll.findOne(query);

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error('api/overtime-orders/request: ' + error);
    return NextResponse.json(
      { error: 'overtime-orders/request api' },
      { status: 400 },
    );
  }
}
