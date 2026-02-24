import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { dbc } from '@/lib/db/mongo';
import { Locale } from '@/lib/config/i18n';
import { getDictionary } from '../../../lib/dict';
import { COLLECTIONS } from '../../../lib/constants';
import { canManageCompetencies } from '../../../lib/permissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PositionForm } from '../../../components/positions/position-form';
import { fetchCertificationTypes } from '../../../lib/fetch-cert-types';

export default async function AddPositionPage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const session = await auth();

  if (!session || !session.user?.email) {
    redirect(`/${lang}/auth?callbackUrl=/competency-matrix/positions/add`);
  }

  const userRoles = session.user.roles ?? [];
  if (!canManageCompetencies(userRoles)) {
    redirect(`/${lang}/competency-matrix`);
  }

  const [competenciesColl, employeesColl, certTypes] = await Promise.all([
    dbc(COLLECTIONS.competencies),
    dbc(COLLECTIONS.employees),
    fetchCertificationTypes(),
  ]);

  const [competencies, deptAgg] = await Promise.all([
    competenciesColl
      .find({ active: true })
      .sort({ processArea: 1 })
      .toArray(),
    employeesColl
      .aggregate([
        { $match: { department: { $ne: null } } },
        { $group: { _id: '$department' } },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
  ]);

  const serializedCompetencies = competencies.map((c) => ({
    ...c,
    _id: c._id.toString(),
  })) as unknown as import('../../../lib/types').CompetencyType[];
  const departments = deptAgg.map((d) => d._id as string);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.positions.addTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <PositionForm
          dict={dict}
          lang={lang}
          competencies={serializedCompetencies}
          departments={departments}
          certificationTypes={certTypes}
        />
      </CardContent>
    </Card>
  );
}
