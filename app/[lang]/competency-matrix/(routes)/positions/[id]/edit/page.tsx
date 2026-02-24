import { ObjectId } from 'mongodb';
import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { dbc } from '@/lib/db/mongo';
import { Locale } from '@/lib/config/i18n';
import { getDictionary } from '../../../../lib/dict';
import { COLLECTIONS } from '../../../../lib/constants';
import { canManageCompetencies } from '../../../../lib/permissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PositionForm } from '../../../../components/positions/position-form';
import { fetchCertificationTypes } from '../../../../lib/fetch-cert-types';

export default async function EditPositionPage({
  params,
}: {
  params: Promise<{ lang: Locale; id: string }>;
}) {
  const { lang, id } = await params;
  const dict = await getDictionary(lang);
  const session = await auth();

  if (!session || !session.user?.email) {
    redirect(
      `/${lang}/auth?callbackUrl=/competency-matrix/positions/${id}/edit`,
    );
  }

  const userRoles = session.user.roles ?? [];
  if (!canManageCompetencies(userRoles)) {
    redirect(`/${lang}/competency-matrix`);
  }

  const [positionsColl, competenciesColl, employeesColl, certTypes] = await Promise.all([
    dbc(COLLECTIONS.positions),
    dbc(COLLECTIONS.competencies),
    dbc(COLLECTIONS.employees),
    fetchCertificationTypes(),
  ]);

  const [doc, competencies, deptAgg] = await Promise.all([
    positionsColl.findOne({ _id: new ObjectId(id) }),
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

  if (!doc) notFound();

  const position = { ...doc, _id: doc._id.toString() } as unknown as import('../../../../lib/types').PositionType;
  const serializedCompetencies = competencies.map((c) => ({
    ...c,
    _id: c._id.toString(),
  })) as unknown as import('../../../../lib/types').CompetencyType[];
  const departments = deptAgg.map((d) => d._id as string);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.positions.editTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <PositionForm
          dict={dict}
          lang={lang}
          competencies={serializedCompetencies}
          departments={departments}
          certificationTypes={certTypes}
          position={position}
        />
      </CardContent>
    </Card>
  );
}
