export const dynamic = 'force-dynamic';

import { ObjectId } from 'mongodb';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { dbc } from '@/lib/db/mongo';
import { Locale } from '@/lib/config/i18n';
import { getDictionary } from '../../../lib/dict';
import { COLLECTIONS } from '../../../lib/constants';
import { localize } from '../../../lib/types';
import { isHrOrAdmin, canApproveAssessments } from '../../../lib/permissions';
import { MatchBadge } from '../../../components/shared/match-badge';
import { ApproveButton } from '../../../components/assessments/approve-button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ lang: Locale; id: string }>;
}) {
  const { lang, id } = await params;
  const dict = await getDictionary(lang);
  const session = await auth();
  const safeLang = (['pl', 'de', 'en'].includes(lang) ? lang : 'pl') as 'pl' | 'de' | 'en';

  if (!session || !session.user?.email) {
    redirect(
      `/${lang}/auth?callbackUrl=/competency-matrix/assessments/${id}`,
    );
  }

  const userRoles = session.user.roles ?? [];

  const [assessmentsColl, employeesColl, competenciesColl, positionsColl] =
    await Promise.all([
      dbc(COLLECTIONS.assessments),
      dbc(COLLECTIONS.employees),
      dbc(COLLECTIONS.competencies),
      dbc(COLLECTIONS.positions),
    ]);

  const assessment = await assessmentsColl.findOne({
    _id: new ObjectId(id),
  });
  if (!assessment) notFound();

  // Load employee
  const employee = await employeesColl.findOne({
    identifier: assessment.employeeIdentifier,
  });

  // Load position
  const position = assessment.positionId
    ? await positionsColl.findOne({
        _id: new ObjectId(assessment.positionId),
      })
    : null;
  type Req = { competencyId: string; requiredLevel: number; weight: number };
  const requirements: Req[] = position?.requiredCompetencies ?? [];
  const reqMap = new Map<string, Req>(
    requirements.map((r) => [r.competencyId, r]),
  );

  // Load competency names
  const compIds = (assessment.ratings || []).map(
    (r: { competencyId: string }) => new ObjectId(r.competencyId),
  );
  const competencies = await competenciesColl
    .find({ _id: { $in: compIds } })
    .toArray();
  const compMap = new Map(competencies.map((c) => [c._id.toString(), c]));

  // Load comparison: self-assessment (if this is supervisor) or supervisor (if this is self)
  const comparisonType =
    assessment.assessmentType === 'self' ? 'supervisor' : 'self';
  const comparison = await assessmentsColl.findOne({
    employeeIdentifier: assessment.employeeIdentifier,
    evaluationPeriodId: assessment.evaluationPeriodId,
    assessmentType: comparisonType,
    status: { $in: ['submitted', 'approved'] },
  });
  const comparisonRatingMap = comparison
    ? new Map<string, number | null>(
        (comparison.ratings || []).map((r: { competencyId: string; rating: number | null }) => [
          r.competencyId,
          r.rating,
        ]),
      )
    : null;

  const canApprove =
    canApproveAssessments(userRoles) && assessment.status === 'submitted';

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>{dict.assessments.detailTitle}</CardTitle>
          <CardDescription>
            {employee
              ? `${employee.firstName} ${employee.lastName}`
              : assessment.employeeIdentifier}{' '}
            —{' '}
            {assessment.assessmentType === 'self'
              ? dict.assessments.selfAssessment
              : dict.assessments.supervisorAssessment}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div>
            <Badge
              variant={
                assessment.status === 'approved'
                  ? 'statusApproved'
                  : assessment.status === 'submitted'
                    ? 'statusPending'
                    : 'statusDraft'
              }
            >
              {dict.status[assessment.status as keyof typeof dict.status]}
            </Badge>
          </div>
          {assessment.overallMatchPercentage != null && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {dict.assessments.overallMatch}:
              </span>
              <MatchBadge matchPercentage={assessment.overallMatchPercentage} />
            </div>
          )}
          <div className="text-sm">
            {dict.assessments.gapCount}: {assessment.gapCount ?? 0}
          </div>
          <div className="text-sm">
            {dict.assessments.criticalGaps}: {assessment.criticalGapCount ?? 0}
          </div>
          {canApprove && (
            <ApproveButton
              assessmentId={id}
              dict={dict}
              lang={lang}
            />
          )}
        </CardContent>
      </Card>

      {/* Ratings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {dict.assessments.rating}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{dict.competencies.name}</TableHead>
                  <TableHead>{dict.positions.requiredLevel}</TableHead>
                  <TableHead>{dict.assessments.rating}</TableHead>
                  {comparisonRatingMap && (
                    <TableHead>{dict.assessments.comparison}</TableHead>
                  )}
                  <TableHead>{dict.assessments.difference}</TableHead>
                  <TableHead>{dict.assessments.comment}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(assessment.ratings || []).map(
                  (r: { competencyId: string; rating: number | null; comment?: string }) => {
                    const comp = compMap.get(r.competencyId);
                    const req = reqMap.get(r.competencyId);
                    const diff =
                      r.rating != null && req
                        ? r.rating - req.requiredLevel
                        : null;
                    const comparisonRating = comparisonRatingMap?.get(
                      r.competencyId,
                    );

                    return (
                      <TableRow key={r.competencyId}>
                        <TableCell className="font-medium">
                          {comp
                            ? localize(comp.name, safeLang)
                            : r.competencyId}
                        </TableCell>
                        <TableCell className="text-center">
                          {req?.requiredLevel ?? '-'}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {r.rating ?? dict.assessments.notApplicable}
                        </TableCell>
                        {comparisonRatingMap && (
                          <TableCell className="text-center">
                            {comparisonRating ?? dict.assessments.notApplicable}
                          </TableCell>
                        )}
                        <TableCell className="text-center">
                          {diff !== null ? (
                            <span
                              className={
                                diff >= 0
                                  ? 'text-green-600'
                                  : 'text-red-600 font-medium'
                              }
                            >
                              {diff > 0 ? '+' : ''}
                              {diff}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.comment || '-'}
                        </TableCell>
                      </TableRow>
                    );
                  },
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
