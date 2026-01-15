import { dbc } from '@/lib/db/mongo';
import { extractFullNameFromEmail } from '@/lib/utils/name-format';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const coll = await dbc('overtime_submissions');

    // Use aggregation instead of distinct (not supported in Stable API v1)
    const result = await coll
      .aggregate([
        { $match: { supervisor: { $exists: true, $nin: [null, ''] } } },
        { $group: { _id: '$supervisor' } },
      ])
      .toArray();

    const supervisorsList = result
      .map((doc) => ({
        _id: doc._id as string,
        email: doc._id as string,
        name: extractFullNameFromEmail(doc._id as string),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(supervisorsList);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('api/overtime-submissions/supervisors:', errorMsg);
    return NextResponse.json(
      { error: errorMsg },
      { status: 503 }
    );
  }
}
