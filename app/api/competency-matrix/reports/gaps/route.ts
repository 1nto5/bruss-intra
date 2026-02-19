export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { dbc } from '@/lib/db/mongo';

export async function GET(req: NextRequest) {
  try {
    const coll = await dbc('assessments');

    const gaps = await coll
      .aggregate([
        {
          $match: {
            assessmentType: 'supervisor',
            status: 'approved',
          },
        },
        { $unwind: '$ratings' },
        {
          $lookup: {
            from: 'positions',
            let: { posId: { $toObjectId: '$positionId' } },
            pipeline: [
              { $match: { $expr: { $eq: ['$_id', '$$posId'] } } },
              { $unwind: '$requiredCompetencies' },
              {
                $project: {
                  competencyId: '$requiredCompetencies.competencyId',
                  requiredLevel: '$requiredCompetencies.requiredLevel',
                },
              },
            ],
            as: 'requirements',
          },
        },
        {
          $addFields: {
            requirement: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: '$requirements',
                    cond: {
                      $eq: [
                        '$$this.competencyId',
                        '$ratings.competencyId',
                      ],
                    },
                  },
                },
                0,
              ],
            },
          },
        },
        {
          $match: {
            'requirement.requiredLevel': { $exists: true },
            'ratings.rating': { $ne: null },
          },
        },
        {
          $addFields: {
            gap: {
              $subtract: [
                '$requirement.requiredLevel',
                '$ratings.rating',
              ],
            },
          },
        },
        { $match: { gap: { $gt: 0 } } },
        {
          $group: {
            _id: '$ratings.competencyId',
            avgGap: { $avg: '$gap' },
            maxGap: { $max: '$gap' },
            affectedCount: { $sum: 1 },
          },
        },
        { $sort: { avgGap: -1 } },
        { $limit: 50 },
      ])
      .toArray();

    return NextResponse.json(gaps);
  } catch (error) {
    console.error(
      'GET /api/competency-matrix/reports/gaps error:',
      error,
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
