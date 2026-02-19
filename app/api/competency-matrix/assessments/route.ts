export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { dbc } from '@/lib/db/mongo';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const employeeIdentifier = searchParams.get('employeeIdentifier');
    const evaluationPeriodId = searchParams.get('evaluationPeriodId');
    const assessmentType = searchParams.get('assessmentType');
    const status = searchParams.get('status');

    const coll = await dbc('assessments');

    const filter: Record<string, unknown> = {};

    if (employeeIdentifier) filter.employeeIdentifier = employeeIdentifier;
    if (evaluationPeriodId) filter.evaluationPeriodId = evaluationPeriodId;
    if (assessmentType) filter.assessmentType = assessmentType;
    if (status) filter.status = status;

    const assessments = await coll
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();

    return NextResponse.json(assessments);
  } catch (error) {
    console.error('GET /api/competency-matrix/assessments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
