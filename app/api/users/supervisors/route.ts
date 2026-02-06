import { dbc } from '@/lib/db/mongo';
import { extractFullNameFromEmail } from '@/lib/utils/name-format';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const coll = await dbc('users');

    // Find users whose roles include "leader" or "manager"
    const users = await coll
      .find({
        roles: { $elemMatch: { $regex: /leader|manager/i } },
      })
      .project({ email: 1 })
      .toArray();

    const supervisorsList = users
      .map((user) => ({
        _id: user.email as string,
        email: user.email as string,
        name: extractFullNameFromEmail(user.email as string),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(supervisorsList);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('api/users/supervisors:', errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 503 });
  }
}
