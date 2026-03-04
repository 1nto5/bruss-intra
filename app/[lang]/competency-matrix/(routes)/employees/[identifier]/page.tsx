import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { Locale } from '@/lib/config/i18n';
import { formatDate } from '@/lib/utils/date-format';
import { getDictionary } from '../../../lib/dict';
import { localize, PROCESS_AREAS } from '../../../lib/types';
import type { I18nString } from '../../../lib/types';
import { fetchEmployeeByIdentifier } from '../../../lib/fetch-employee';
import { fetchEmployeeCertifications } from '../../../lib/fetch-certifications';
import { fetchCertificationTypes } from '../../../lib/fetch-cert-types';
import {
  fetchEmployeeRatings,
  fetchPositionRequirements,
  getPositionRequirements,
  computeEmployeeMatch,
  fetchActiveCompetencies,
} from '../../../lib/fetch-employee-ratings';
import { PROCESS_AREA_LABELS } from '../../../lib/constants';
import type { CompetencyRating, RequiredCompetency, CompetencyType } from '../../../lib/types';
import { fetchEmployeeEvaluations } from '../../../lib/fetch-evaluations';
import { hasFullAccess, isManager, canManageCompetencies, canSupervisorAssess } from '../../../lib/permissions';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

  const employee = await fetchEmployeeByIdentifier(identifier);
  if (!employee) notFound();

  const showCompetencies = hasFullAccess(userRoles) || isManager(userRoles);

  const [certifications, certTypes, employeeRatings, positionReqMap, competencies, evaluations] =
    await Promise.all([
      fetchEmployeeCertifications(identifier),
      fetchCertificationTypes(),
      showCompetencies ? fetchEmployeeRatings(identifier) : Promise.resolve([]),
      showCompetencies ? fetchPositionRequirements() : Promise.resolve(new Map()),
      showCompetencies ? fetchActiveCompetencies() : Promise.resolve([]),
      showCompetencies ? fetchEmployeeEvaluations(identifier) : Promise.resolve([]),
    ]);

  const certTypeMap = new Map<string, I18nString>(
    certTypes.map((ct: { slug: string; name: I18nString }) => [ct.slug, ct.name]),
  );

  const now = new Date();

  // Build competency data for the profile card
  const positionRequirements: RequiredCompetency[] =
    getPositionRequirements(positionReqMap, employee.position) ?? [];
  const ratingMap = new Map<string, number | null>(
    employeeRatings.map((r: CompetencyRating) => [r.competencyId, r.rating]),
  );
  const requirementMap = new Map(
    positionRequirements.map((r) => [r.competencyId, r]),
  );

  // Group competencies by process area - only include those with a rating or requirement
  const relevantCompetencies = (competencies as unknown as CompetencyType[]).filter((c) => {
    const id = c._id!.toString();
    return ratingMap.has(id) || requirementMap.has(id);
  });

  const groupedByArea = new Map<string, CompetencyType[]>();
  for (const c of relevantCompetencies) {
    const area = c.processArea;
    if (!groupedByArea.has(area)) groupedByArea.set(area, []);
    groupedByArea.get(area)!.push(c);
  }

  const matchInfo =
    employeeRatings.length > 0 && positionRequirements.length > 0
      ? computeEmployeeMatch(employeeRatings, positionRequirements)
      : null;

  const statusVariant = (status: string) => {
    switch (status) {
      case 'draft': return 'statusPending' as const;
      case 'submitted': return 'statusInProgress' as const;
      case 'approved': return 'statusApproved' as const;
      default: return 'outline' as const;
    }
  };

  return (
    <div className="space-y-2">
      {/* Employee Header */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>
              {employee.firstName} {employee.lastName}
            </CardTitle>
            <div className="mt-1 space-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                {dict.myProfile.contractUntil}:{' '}
                {employee.endDate ? (() => {
                  const endDate = new Date(employee.endDate);
                  const daysUntil = Math.ceil(
                    (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
                  );
                  return (
                    <Badge
                      variant={
                        daysUntil < 0
                          ? 'statusRejected'
                          : daysUntil <= 30
                            ? 'statusOverdue'
                            : daysUntil <= 90
                              ? 'statusPending'
                              : 'outline'
                      }
                      size="sm"
                    >
                      {formatDate(endDate)}
                    </Badge>
                  );
                })() : (
                  <Badge variant="secondary" size="sm">{dict.employees.permanent}</Badge>
                )}
              </span>
              <p>
                {dict.employees.identifier}: {employee.identifier}
              </p>
              <p>
                {dict.employees.position}: {employee.position || '-'}
              </p>
              <p>
                {dict.employees.department}: {employee.department || '-'}
              </p>
              <p>
                {dict.employees.manager}: {employee.manager || '-'}
              </p>
            </div>
          </div>
          {matchInfo && (
            <Badge variant={matchInfo.badgeVariant} size="sm">
              {dict.employees.matchPercent}: {matchInfo.matchPercent}%
            </Badge>
          )}
        </CardHeader>
      </Card>

      {/* Certifications */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            {dict.certifications.title}
          </CardTitle>
          {hasFullAccess(userRoles) && (
            <Button size="sm" asChild>
              <Link
                href={`/${lang}/competency-matrix/certifications/add?employee=${identifier}`}
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
                  {certifications.map((cert: Record<string, unknown>) => {
                    const isExpired =
                      cert.expirationDate && new Date(cert.expirationDate as string) < now;
                    const isExpiringSoon =
                      cert.expirationDate &&
                      !isExpired &&
                      new Date(cert.expirationDate as string).getTime() - now.getTime() <
                        30 * 24 * 60 * 60 * 1000;

                    return (
                      <TableRow key={(cert._id as string).toString()}>
                        <TableCell>
                          {localize(
                            certTypeMap.get(cert.certificationType as string),
                            safeLang,
                          ) || (cert.certificationType as string)}
                        </TableCell>
                        <TableCell>
                          {cert.issuedDate
                            ? new Date(cert.issuedDate as string).toLocaleDateString()
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {cert.expirationDate
                            ? new Date(cert.expirationDate as string).toLocaleDateString()
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

      {/* Competency Ratings */}
      {showCompetencies && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              {dict.employees.competencyRatings}
            </CardTitle>
            {canManageCompetencies(userRoles) && (
              <Button size="sm" asChild>
                <Link
                  href={`/${lang}/competency-matrix/employees/${identifier}/competencies/edit`}
                >
                  {dict.edit}
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {relevantCompetencies.length > 0 ? (
              <div className="space-y-6">
                {[...groupedByArea.entries()]
                  .sort(([a], [b]) => PROCESS_AREAS.indexOf(a as typeof PROCESS_AREAS[number]) - PROCESS_AREAS.indexOf(b as typeof PROCESS_AREAS[number]))
                  .map(([area, comps]) => (
                  <div key={area}>
                    <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
                      {localize(
                        PROCESS_AREA_LABELS[area as keyof typeof PROCESS_AREA_LABELS],
                        safeLang,
                      )}
                    </h4>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{dict.competencies.name}</TableHead>
                            <TableHead className="w-28">{dict.employees.employeeLevel}</TableHead>
                            <TableHead className="w-28">{dict.positions.requiredLevel}</TableHead>
                            <TableHead className="w-20">{dict.employees.gap}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {comps.map((comp) => {
                            const id = comp._id!.toString();
                            const empRating = ratingMap.get(id);
                            const req = requirementMap.get(id);
                            const reqLevel = req?.requiredLevel ?? null;

                            const hasGap =
                              empRating !== null &&
                              empRating !== undefined &&
                              reqLevel !== null &&
                              empRating < reqLevel;
                            const meetsReq =
                              empRating !== null &&
                              empRating !== undefined &&
                              reqLevel !== null &&
                              empRating >= reqLevel;

                            return (
                              <TableRow key={id}>
                                <TableCell>
                                  {localize(comp.name, safeLang)}
                                </TableCell>
                                <TableCell>
                                  {empRating != null ? (
                                    empRating
                                  ) : (
                                    <span className="text-muted-foreground">
                                      {dict.employees.notApplicable}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {reqLevel != null ? (
                                    reqLevel
                                  ) : (
                                    <span className="text-muted-foreground">
                                      -
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {hasGap ? (
                                    <Badge variant="statusRejected" size="sm">
                                      -{reqLevel! - empRating!}
                                    </Badge>
                                  ) : meetsReq ? (
                                    <Badge variant="statusApproved" size="sm">
                                      OK
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      -
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
              <p className="mt-4 text-xs text-muted-foreground">
                  {dict.employees.levelLegend}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {dict.employees.noRatings}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Evaluations */}
      {showCompetencies && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              {dict.evaluations.title}
            </CardTitle>
            {canSupervisorAssess(userRoles) && (
              <Button size="sm" asChild>
                <Link
                  href={`/${lang}/competency-matrix/evaluations/create?employee=${identifier}`}
                >
                  {dict.add}
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {(evaluations as Record<string, unknown>[]).length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{dict.evaluations.period}</TableHead>
                      <TableHead>{dict.evaluations.assessor}</TableHead>
                      <TableHead>{dict.evaluations.grade}</TableHead>
                      <TableHead>{dict.competencies.status}</TableHead>
                      <TableHead>{dict.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(evaluations as Record<string, unknown>[]).map((ev) => (
                      <TableRow key={(ev._id as string).toString()}>
                        <TableCell>
                          {formatDate(ev.periodFrom as string | Date)} -{' '}
                          {formatDate(ev.periodTo as string | Date)}
                        </TableCell>
                        <TableCell>{ev.assessorName as string}</TableCell>
                        <TableCell>
                          {(ev.supervisorTotalPoints as number) > 0 ? (
                            <Badge
                              variant={ev.isPositive ? 'statusApproved' : 'statusRejected'}
                              size="sm"
                            >
                              {dict.evaluations.grades[ev.grade as keyof typeof dict.evaluations.grades] ?? ev.grade}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(ev.status as string)} size="sm">
                            {dict.status[(ev.status as string) as keyof typeof dict.status] ?? ev.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/${lang}/competency-matrix/evaluations/${(ev._id as string).toString()}`}
                            className="text-sm hover:underline"
                          >
                            {dict.details}
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{dict.evaluations.noEvaluations}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
