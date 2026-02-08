import { dbc } from '@/lib/db/mongo';
import type { Filter, Document } from 'mongodb';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const managed = searchParams.get('managed');

  try {
    const coll = await dbc('employees');

    // Managed mode: for employee-management admin page
    if (managed === 'true') {
      const userRoles = searchParams.get('userRoles')?.split(',') || [];
      const isAdmin = userRoles.includes('admin');
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'unauthorized' },
          { status: 403 },
        );
      }

      const filters: Filter<Document> = {};

      // Search filter (regex on identifier, firstName, lastName)
      const search = searchParams.get('search');
      if (search) {
        const regex = { $regex: search, $options: 'i' };
        filters.$or = [
          { identifier: regex },
          { firstName: regex },
          { lastName: regex },
        ];
      }

      const employees = await coll
        .find(filters)
        .sort({ lastName: 1, firstName: 1 })
        .toArray();

      const data = employees.map((e) => ({
        _id: e._id.toString(),
        identifier: e.identifier,
        firstName: e.firstName,
        lastName: e.lastName,
        createdAt: e.createdAt,
        createdBy: e.createdBy,
        editedAt: e.editedAt,
        editedBy: e.editedBy,
      }));

      return new NextResponse(JSON.stringify(data));
    }

    // Default mode: return all non-inactive employees (backward compat)
    const employees = await coll
      .find({ status: { $ne: 'inactive' } })
      .sort({ firstName: 1, lastName: 1 })
      .toArray();
    return new NextResponse(JSON.stringify(employees));
  } catch (error) {
    console.error('api/employees: ' + error);
    return NextResponse.json({ error: 'employees api' }, { status: 503 });
  }
}
