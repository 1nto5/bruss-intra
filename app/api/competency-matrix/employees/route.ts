export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { dbc } from '@/lib/db/mongo';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const department = searchParams.get('department');
    const search = searchParams.get('search');
    const manager = searchParams.get('manager');

    const coll = await dbc('employees');

    const filter: Record<string, unknown> = {};

    if (department) {
      filter.department = department;
    }

    if (manager) {
      filter.$or = [{ manager }];
    }

    if (search) {
      const searchFilter = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { identifier: { $regex: search, $options: 'i' } },
        { position: { $regex: search, $options: 'i' } },
      ];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or as Record<string, unknown>[] }, { $or: searchFilter }];
        delete filter.$or;
      } else {
        filter.$or = searchFilter;
      }
    }

    const employees = await coll
      .find(filter)
      .project({
        identifier: 1,
        firstName: 1,
        lastName: 1,
        department: 1,
        position: 1,
        manager: 1,
        hireDate: 1,
        endDate: 1,
        email: 1,
      })
      .sort({ lastName: 1, firstName: 1 })
      .toArray();

    return NextResponse.json(employees);
  } catch (error) {
    console.error('GET /api/competency-matrix/employees error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
