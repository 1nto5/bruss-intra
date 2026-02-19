export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { dbc } from '@/lib/db/mongo';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const processArea = searchParams.get('processArea');
    const active = searchParams.get('active');
    const search = searchParams.get('search');

    const coll = await dbc('competencies');

    const filter: Record<string, unknown> = {};

    if (processArea) {
      filter.processArea = processArea;
    }

    if (active !== null && active !== '') {
      filter.active = active === 'true';
    }

    if (search) {
      filter.$or = [
        { 'name.pl': { $regex: search, $options: 'i' } },
        { 'name.de': { $regex: search, $options: 'i' } },
        { 'name.en': { $regex: search, $options: 'i' } },
      ];
    }

    const competencies = await coll
      .find(filter)
      .sort({ processArea: 1, sortOrder: 1 })
      .toArray();

    return NextResponse.json(competencies);
  } catch (error) {
    console.error('GET /api/competency-matrix/competencies error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
