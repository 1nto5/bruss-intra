export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { dbc } from '@/lib/db/mongo';
import { Locale } from '@/lib/config/i18n';
import { getDictionary } from '../../lib/dict';
import { COLLECTIONS } from '../../lib/constants';
import {
  canManageCompetencies,
  canDeleteCompetencies,
} from '../../lib/permissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PositionTable } from '../../components/positions/position-table';

export default async function PositionsPage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const session = await auth();

  if (!session || !session.user?.email) {
    redirect(`/${lang}/auth?callbackUrl=/competency-matrix/positions`);
  }

  const userRoles = session.user.roles ?? [];
  if (!canManageCompetencies(userRoles)) {
    redirect(`/${lang}/competency-matrix`);
  }

  const [positionsColl, employeesColl] = await Promise.all([
    dbc(COLLECTIONS.positions),
    dbc(COLLECTIONS.employees),
  ]);

  const [positions, employeeCounts] = await Promise.all([
    positionsColl.find({}).sort({ department: 1, 'name.pl': 1 }).toArray(),
    employeesColl
      .aggregate([
        { $match: { position: { $ne: null } } },
        { $group: { _id: '$position', count: { $sum: 1 } } },
      ])
      .toArray(),
  ]);

  const countMap = new Map(
    employeeCounts.map((e) => [e._id as string, e.count as number]),
  );

  const serialized = positions.map((p) => ({
    ...p,
    _id: p._id.toString(),
    employeeCount: countMap.get(p.name?.pl) ?? 0,
  })) as unknown as (import('../../lib/types').PositionType & { employeeCount: number })[];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{dict.positions.title}</CardTitle>
        <Button asChild>
          <Link href={`/${lang}/competency-matrix/positions/add`}>
            {dict.add}
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <PositionTable
          data={serialized}
          dict={dict}
          lang={lang}
          canEdit={canManageCompetencies(userRoles)}
          canDelete={canDeleteCompetencies(userRoles)}
        />
      </CardContent>
    </Card>
  );
}
