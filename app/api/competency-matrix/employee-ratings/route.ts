export const revalidate = 28800;

import { NextRequest, NextResponse } from 'next/server';
import { dbc } from '@/lib/db/mongo';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const identifier = searchParams.get('identifier');
    const identifiers = searchParams.get('identifiers');

    const coll = await dbc('competency_matrix_employee_ratings');

    if (identifier) {
      const doc = await coll.findOne({ employeeIdentifier: identifier });
      return NextResponse.json(doc ?? null);
    }

    if (identifiers) {
      const ids = identifiers.split(',').filter(Boolean);
      const docs = await coll
        .find({ employeeIdentifier: { $in: ids } })
        .toArray();
      return NextResponse.json(docs);
    }

    const docs = await coll.find({}).toArray();
    return NextResponse.json(docs);
  } catch (error) {
    console.error('GET /api/competency-matrix/employee-ratings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
