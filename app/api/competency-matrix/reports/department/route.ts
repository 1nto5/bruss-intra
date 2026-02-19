export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { dbc } from '@/lib/db/mongo';

export async function GET(req: NextRequest) {
  try {
    const coll = await dbc('assessments');

    const deptStats = await coll
      .aggregate([
        {
          $match: {
            assessmentType: 'supervisor',
            status: 'approved',
          },
        },
        {
          $lookup: {
            from: 'employees',
            localField: 'employeeIdentifier',
            foreignField: 'identifier',
            as: 'employee',
          },
        },
        { $unwind: '$employee' },
        {
          $group: {
            _id: '$employee.department',
            avgMatch: { $avg: '$overallMatchPercentage' },
            totalAssessments: { $sum: 1 },
            totalGaps: { $sum: '$gapCount' },
            totalCriticalGaps: { $sum: '$criticalGapCount' },
          },
        },
        { $sort: { avgMatch: 1 } },
      ])
      .toArray();

    return NextResponse.json(deptStats);
  } catch (error) {
    console.error(
      'GET /api/competency-matrix/reports/department error:',
      error,
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
