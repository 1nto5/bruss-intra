export const revalidate = 3600;

import { NextRequest, NextResponse } from 'next/server';
import { dbc } from '@/lib/db/mongo';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const employeeIdentifier = searchParams.get('employeeIdentifier');

    const coll = await dbc('competency_matrix_evaluation_periods');

    const filter: Record<string, unknown> = {};

    if (employeeIdentifier) {
      filter.employeeIdentifiers = employeeIdentifier;
    }

    const periods = await coll
      .find(filter)
      .sort({ startDate: -1 })
      .toArray();

    return NextResponse.json(periods);
  } catch (error) {
    console.error('GET /api/competency-matrix/evaluation-periods error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
