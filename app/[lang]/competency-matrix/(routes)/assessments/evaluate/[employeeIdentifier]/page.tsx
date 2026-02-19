export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { dbc } from '@/lib/db/mongo';
import { ObjectId } from 'mongodb';
import { Locale } from '@/lib/config/i18n';
import { getDictionary } from '../../../../lib/dict';
import { COLLECTIONS } from '../../../../lib/constants';
import { canSupervisorAssess } from '../../../../lib/permissions';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AssessmentForm } from '../../../../components/assessments/assessment-form';

export default async function EvaluatePage({
  params,
  searchParams: searchParamsPromise,
}: {
  params: Promise<{ lang: Locale; employeeIdentifier: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { lang, employeeIdentifier } = await params;
  const searchParams = await searchParamsPromise;
  const dict = await getDictionary(lang);
  const session = await auth();

  if (!session || !session.user?.email) {
    redirect(
      `/${lang}/auth?callbackUrl=/competency-matrix/assessments/evaluate/${employeeIdentifier}`,
    );
  }

  const userEmail = session.user.email;
  const userRoles = session.user.roles ?? [];

  const [employeesColl, positionsColl, competenciesColl, assessmentsColl, periodsColl] =
    await Promise.all([
      dbc(COLLECTIONS.employees),
      dbc(COLLECTIONS.positions),
      dbc(COLLECTIONS.competencies),
      dbc(COLLECTIONS.assessments),
      dbc(COLLECTIONS.evaluationPeriods),
    ]);

  // Find employee
  const employee = await employeesColl.findOne({
    identifier: employeeIdentifier,
  });
  if (!employee) notFound();

  // Determine assessment type
  const selfEmployee = await employeesColl.findOne({
    email: userEmail.toLowerCase(),
  });
  const isSelfAssessment =
    selfEmployee?.identifier === employeeIdentifier;

  if (!isSelfAssessment && !canSupervisorAssess(userRoles)) {
    redirect(`/${lang}/competency-matrix`);
  }

  const assessmentType = isSelfAssessment ? 'self' : 'supervisor';

  // Get active evaluation period (or use query param)
  let evaluationPeriodId = searchParams.period;
  if (!evaluationPeriodId) {
    const activePeriod = await periodsColl.findOne({ status: 'active' });
    if (!activePeriod) {
      // No active period
      return (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">{dict.noData}</p>
          </CardContent>
        </Card>
      );
    }
    evaluationPeriodId = activePeriod._id.toString();
  }

  // Find position
  const position = employee.position
    ? await positionsColl.findOne({
        'name.pl': employee.position,
        active: true,
      })
    : null;

  if (!position) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">
            {dict.employees.position}: {dict.errors.notFound}
          </p>
        </CardContent>
      </Card>
    );
  }

  const requirements = position.requiredCompetencies || [];
  const competencyIds = requirements.map(
    (r: { competencyId: string }) => new ObjectId(r.competencyId),
  );

  const competencies =
    competencyIds.length > 0
      ? await competenciesColl
          .find({ _id: { $in: competencyIds } })
          .toArray()
      : [];

  const serializedComps = competencies.map((c) => ({
    ...c,
    _id: c._id.toString(),
  })) as unknown as import('../../../../lib/types').CompetencyType[];

  // Check for existing draft
  const existingDraft = await assessmentsColl.findOne({
    employeeIdentifier,
    evaluationPeriodId,
    assessmentType,
    assessorEmail: userEmail,
    status: 'draft',
  });

  // For supervisor assessment: load self-assessment ratings
  let selfRatings = undefined;
  if (assessmentType === 'supervisor') {
    const selfAssessment = await assessmentsColl.findOne({
      employeeIdentifier,
      evaluationPeriodId,
      assessmentType: 'self',
      status: { $in: ['submitted', 'approved'] },
    });
    selfRatings = selfAssessment?.ratings;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            {assessmentType === 'self'
              ? dict.assessments.selfAssessment
              : dict.assessments.supervisorAssessment}
          </CardTitle>
          <CardDescription>
            {employee.firstName} {employee.lastName} — {employee.position}
          </CardDescription>
        </CardHeader>
      </Card>

      {assessmentType === 'supervisor' && !selfRatings && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-amber-600 font-medium">
              {dict.assessments.noSelfAssessment}
            </p>
          </CardContent>
        </Card>
      )}

      <AssessmentForm
        dict={dict}
        lang={lang}
        employeeIdentifier={employeeIdentifier}
        positionId={position._id.toString()}
        evaluationPeriodId={evaluationPeriodId}
        assessmentType={assessmentType}
        competencies={serializedComps}
        requirements={requirements}
        existingRatings={existingDraft?.ratings}
        existingId={existingDraft?._id?.toString()}
        selfRatings={selfRatings}
      />
    </div>
  );
}
