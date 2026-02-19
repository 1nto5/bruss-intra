export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { dbc } from '@/lib/db/mongo';
import { Locale } from '@/lib/config/i18n';
import { getDictionary } from '../../../lib/dict';
import { COLLECTIONS } from '../../../lib/constants';
import { CERTIFICATION_TYPE_LABELS } from '../../../lib/constants';
import { localize } from '../../../lib/types';
import type { CertificationType as CertType } from '../../../lib/types';
import { isHrOrAdmin, canSupervisorAssess } from '../../../lib/permissions';
import { MatchBadge } from '../../../components/shared/match-badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ lang: Locale; identifier: string }>;
}) {
  const { lang, identifier } = await params;
  const dict = await getDictionary(lang);
  const session = await auth();
  const safeLang = (['pl', 'de', 'en'].includes(lang) ? lang : 'pl') as 'pl' | 'de' | 'en';

  if (!session || !session.user?.email) {
    redirect(
      `/${lang}/auth?callbackUrl=/competency-matrix/employees/${identifier}`,
    );
  }

  const userRoles = session.user.roles ?? [];

  const [employeesColl, assessmentsColl, certsColl, positionsColl, competenciesColl] =
    await Promise.all([
      dbc(COLLECTIONS.employees),
      dbc(COLLECTIONS.assessments),
      dbc(COLLECTIONS.employeeCertifications),
      dbc(COLLECTIONS.positions),
      dbc(COLLECTIONS.competencies),
    ]);

  const employee = await employeesColl.findOne({ identifier });
  if (!employee) notFound();

  // Load position for this employee
  const position = employee.position
    ? await positionsColl.findOne({ 'name.pl': employee.position, active: true })
    : null;

  // Load assessments and certifications in parallel
  const [assessments, certifications] = await Promise.all([
    assessmentsColl
      .find({ employeeIdentifier: identifier })
      .sort({ createdAt: -1 })
      .toArray(),
    certsColl
      .find({ employeeIdentifier: identifier })
      .sort({ expirationDate: 1 })
      .toArray(),
  ]);

  // Load competency names for display
  const allCompetencyIds = new Set<string>();
  for (const a of assessments) {
    for (const r of a.ratings || []) {
      allCompetencyIds.add(r.competencyId);
    }
  }
  const { ObjectId } = await import('mongodb');
  const competencies =
    allCompetencyIds.size > 0
      ? await competenciesColl
          .find({
            _id: { $in: [...allCompetencyIds].map((id) => new ObjectId(id)) },
          })
          .toArray()
      : [];
  const compMap = new Map(competencies.map((c) => [c._id.toString(), c]));

  const now = new Date();
  const latestApproved = assessments.find(
    (a) => a.assessmentType === 'supervisor' && a.status === 'approved',
  );

  return (
    <div className="space-y-6">
      {/* Employee Header */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>
              {employee.firstName} {employee.lastName}
            </CardTitle>
            <CardDescription className="mt-1 space-y-1">
              <div>
                {dict.employees.identifier}: {employee.identifier}
              </div>
              <div>
                {dict.employees.position}: {employee.position || '-'}
              </div>
              <div>
                {dict.employees.department}: {employee.department || '-'}
              </div>
              <div>
                {dict.employees.manager}: {employee.manager || '-'}
              </div>
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            {latestApproved && (
              <MatchBadge matchPercentage={latestApproved.overallMatchPercentage} />
            )}
            {employee.endDate ? (
              <Badge variant="outline">{dict.employees.fixedTerm}</Badge>
            ) : (
              <Badge variant="statusApproved">{dict.employees.permanent}</Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="assessments">
        <TabsList>
          <TabsTrigger value="assessments">
            {dict.employees.assessmentHistory}
          </TabsTrigger>
          <TabsTrigger value="competencies">
            {dict.employees.competencies}
          </TabsTrigger>
          <TabsTrigger value="certifications">
            {dict.employees.certifications}
          </TabsTrigger>
        </TabsList>

        {/* Assessment History Tab */}
        <TabsContent value="assessments">
          <Card>
            <CardContent className="pt-6">
              {assessments.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{dict.assessments.assessmentType}</TableHead>
                        <TableHead>{dict.assessments.status}</TableHead>
                        <TableHead>{dict.assessments.matchPercentage}</TableHead>
                        <TableHead>{dict.assessments.gapCount}</TableHead>
                        <TableHead>{dict.assessments.criticalGaps}</TableHead>
                        <TableHead>{dict.assessments.assessor}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assessments.map((a) => (
                        <TableRow key={a._id.toString()}>
                          <TableCell>
                            <Link
                              href={`/${lang}/competency-matrix/assessments/${a._id}`}
                              className="hover:underline"
                            >
                              {a.assessmentType === 'self'
                                ? dict.assessments.selfAssessment
                                : dict.assessments.supervisorAssessment}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                a.status === 'approved'
                                  ? 'statusApproved'
                                  : a.status === 'submitted'
                                    ? 'statusPending'
                                    : 'statusDraft'
                              }
                            >
                              {dict.status[a.status as keyof typeof dict.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {a.overallMatchPercentage != null ? (
                              <MatchBadge matchPercentage={a.overallMatchPercentage} />
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>{a.gapCount ?? '-'}</TableCell>
                          <TableCell>{a.criticalGapCount ?? '-'}</TableCell>
                          <TableCell className="text-sm">
                            {a.assessorEmail || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {dict.employees.noAssessments}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Competencies Tab — show latest approved assessment ratings */}
        <TabsContent value="competencies">
          <Card>
            <CardContent className="pt-6">
              {latestApproved ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{dict.competencies.name}</TableHead>
                        <TableHead>{dict.assessments.rating}</TableHead>
                        <TableHead>{dict.positions.requiredLevel}</TableHead>
                        <TableHead>{dict.assessments.difference}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(latestApproved.ratings || []).map(
                        (r: { competencyId: string; rating: number | null; comment?: string }) => {
                          const comp = compMap.get(r.competencyId);
                          const req = position?.requiredCompetencies?.find(
                            (rc: { competencyId: string }) =>
                              rc.competencyId === r.competencyId,
                          );
                          const diff =
                            r.rating != null && req
                              ? r.rating - req.requiredLevel
                              : null;

                          return (
                            <TableRow key={r.competencyId}>
                              <TableCell>
                                {comp ? localize(comp.name, safeLang) : r.competencyId}
                              </TableCell>
                              <TableCell>
                                {r.rating ?? dict.assessments.notApplicable}
                              </TableCell>
                              <TableCell>
                                {req ? req.requiredLevel : '-'}
                              </TableCell>
                              <TableCell>
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
                            </TableRow>
                          );
                        },
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {dict.employees.noAssessments}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Certifications Tab */}
        <TabsContent value="certifications">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                {dict.certifications.title}
              </CardTitle>
              {isHrOrAdmin(userRoles) && (
                <Button size="sm" asChild>
                  <Link
                    href={`/${lang}/competency-matrix/certifications?employee=${identifier}`}
                  >
                    {dict.add}
                  </Link>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {certifications.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{dict.certifications.type}</TableHead>
                        <TableHead>{dict.certifications.issuedDate}</TableHead>
                        <TableHead>{dict.certifications.expirationDate}</TableHead>
                        <TableHead>{dict.competencies.status}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {certifications.map((cert) => {
                        const isExpired =
                          cert.expirationDate && new Date(cert.expirationDate) < now;
                        const isExpiringSoon =
                          cert.expirationDate &&
                          !isExpired &&
                          new Date(cert.expirationDate).getTime() - now.getTime() <
                            30 * 24 * 60 * 60 * 1000;

                        return (
                          <TableRow key={cert._id.toString()}>
                            <TableCell>
                              {localize(
                                CERTIFICATION_TYPE_LABELS[
                                  cert.certificationType as CertType
                                ],
                                safeLang,
                              ) || cert.certificationType}
                            </TableCell>
                            <TableCell>
                              {cert.issuedDate
                                ? new Date(cert.issuedDate).toLocaleDateString()
                                : '-'}
                            </TableCell>
                            <TableCell>
                              {cert.expirationDate
                                ? new Date(
                                    cert.expirationDate,
                                  ).toLocaleDateString()
                                : dict.certifications.noExpiration}
                            </TableCell>
                            <TableCell>
                              {isExpired ? (
                                <Badge variant="statusRejected">
                                  {dict.certifications.expired}
                                </Badge>
                              ) : isExpiringSoon ? (
                                <Badge variant="statusOverdue">
                                  {dict.certifications.expiringSoon}
                                </Badge>
                              ) : (
                                <Badge variant="statusApproved">
                                  {dict.certifications.valid}
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{dict.noData}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
