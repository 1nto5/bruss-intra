import { dbc } from '@/lib/db/mongo';
import { extractFullNameFromEmail } from '@/lib/utils/name-format';
import { NextResponse } from 'next/server';

// https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config
// https://nextjs.org/docs/app/building-your-application/caching#on-demand-revalidation
// https://nextjs.org/docs/app/api-reference/functions/revalidateTag
export const dynamic = 'force-dynamic';
// 'auto' | 'force-dynamic' | 'error' | 'force-static'

export async function GET() {
  try {
    const coll = await dbc('users');
    const usersData = await coll
      .find({}, { projection: { _id: 1, email: 1 } })
      .toArray();
    const usersList = usersData.map((user) => ({
      _id: user._id.toString(),
      email: user.email,
      name: extractFullNameFromEmail(user.email),
    }));
    return NextResponse.json(usersList);
  } catch (error) {
    console.error('api/users: ' + error);
    return NextResponse.json({ error: 'users api' }, { status: 503 });
  }
}
