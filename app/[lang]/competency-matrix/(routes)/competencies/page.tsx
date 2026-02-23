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
import { CompetencyTable } from '../../components/competencies/competency-table';

export default async function CompetenciesPage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const session = await auth();

  if (!session || !session.user?.email) {
    redirect(`/${lang}/auth?callbackUrl=/competency-matrix/competencies`);
  }

  const userRoles = session.user.roles ?? [];
  if (!canManageCompetencies(userRoles)) {
    redirect(`/${lang}/competency-matrix`);
  }

  const coll = await dbc(COLLECTIONS.competencies);
  const competencies = await coll
    .find({})
    .sort({ processArea: 1, sortOrder: 1 })
    .toArray();

  const serialized = competencies.map((c) => ({
    ...c,
    _id: c._id.toString(),
  })) as unknown as import('../../lib/types').CompetencyType[];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between md:hidden">
        <CardTitle>{dict.competencies.title}</CardTitle>
        <Button asChild>
          <Link href={`/${lang}/competency-matrix/competencies/add`}>
            {dict.add}
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <CompetencyTable
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
