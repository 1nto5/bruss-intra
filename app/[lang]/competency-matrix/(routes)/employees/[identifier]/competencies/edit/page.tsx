import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { dbc } from '@/lib/db/mongo';
import { Locale } from '@/lib/config/i18n';
import { getDictionary } from '../../../../../lib/dict';
import { COLLECTIONS } from '../../../../../lib/constants';
import { canManageCompetencies } from '../../../../../lib/permissions';
import { fetchEmployeeRatings, fetchPositionRequirements, getPositionRequirements, fetchActiveCompetencies } from '../../../../../lib/fetch-employee-ratings';
import type { CompetencyType, RequiredCompetency } from '../../../../../lib/types';
import { EmployeeRatingForm } from '../../../../../components/ratings/employee-rating-form';

export default async function EditEmployeeCompetenciesPage({
  params,
}: {
  params: Promise<{ lang: Locale; identifier: string }>;
}) {
  const { lang, identifier } = await params;
  const dict = await getDictionary(lang);
  const session = await auth();

  if (!session || !session.user?.email) {
    redirect(
      `/${lang}/auth?callbackUrl=/competency-matrix/employees/${identifier}/competencies/edit`,
    );
  }

  const userRoles = session.user.roles ?? [];
  if (!canManageCompetencies(userRoles)) {
    redirect(`/${lang}/competency-matrix/employees/${identifier}`);
  }

  const employeesColl = await dbc(COLLECTIONS.employees);
  const employee = await employeesColl.findOne({ identifier });
  if (!employee) notFound();

  const [currentRatings, positionReqMap, competencyDocs] = await Promise.all([
    fetchEmployeeRatings(identifier),
    fetchPositionRequirements(),
    fetchActiveCompetencies(),
  ]);

  const positionRequirements: RequiredCompetency[] =
    getPositionRequirements(positionReqMap, employee.position) ?? [];

  // Serialize competencies for the client component
  const competencies = competencyDocs.map((c) => ({
    _id: c._id!.toString(),
    name: c.name,
    processArea: c.processArea,
  })) as Array<{ _id: string; name: CompetencyType['name']; processArea: string }>;

  const requirements = positionRequirements.map((r) => ({
    competencyId: r.competencyId,
    requiredLevel: r.requiredLevel,
  }));

  const ratings = currentRatings.map((r) => ({
    competencyId: r.competencyId,
    rating: r.rating as number | null,
  }));

  return (
    <EmployeeRatingForm
      dict={dict}
      lang={lang}
      employeeIdentifier={identifier}
      employeeName={`${employee.firstName} ${employee.lastName}`}
      competencies={competencies}
      requirements={requirements}
      currentRatings={ratings}
    />
  );
}
