import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Locale } from "@/lib/config/i18n";
import { formatDate } from "@/lib/utils/date-format";
import { getDictionary } from "./lib/dict";
import { localize, PROCESS_AREAS } from "./lib/types";
import type {
  I18nString,
  CompetencyRating,
  RequiredCompetency,
  CompetencyType,
} from "./lib/types";
import { PROCESS_AREA_LABELS } from "./lib/constants";
import { fetchEmployeeByEmail } from "./lib/fetch-employee";
import { fetchEmployeeCertifications } from "./lib/fetch-certifications";
import { fetchEmployeeEvaluations } from "./lib/fetch-evaluations";
import { fetchCertificationTypes } from "./lib/fetch-cert-types";
import {
  fetchEmployeeRatings,
  fetchPositionRequirements,
  getPositionRequirements,
  computeEmployeeMatch,
  fetchActiveCompetencies,
} from "./lib/fetch-employee-ratings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function MyProfilePage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const safeLang = (["pl", "de", "en"].includes(lang) ? lang : "pl") as
    | "pl"
    | "de"
    | "en";

  const session = await auth();
  if (!session || !session.user?.email) {
    redirect(`/${lang}/auth?callbackUrl=/competency-matrix`);
  }

  const employee = await fetchEmployeeByEmail(session.user.email);

  if (!employee) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{dict.myProfile.notFound}</CardTitle>
          <CardDescription>
            {dict.myProfile.notFoundDescription}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const [
    certifications,
    certTypes,
    employeeRatings,
    positionReqMap,
    competencies,
    evaluations,
  ] = await Promise.all([
    fetchEmployeeCertifications(employee.identifier),
    fetchCertificationTypes(),
    fetchEmployeeRatings(employee.identifier),
    fetchPositionRequirements(),
    fetchActiveCompetencies(),
    fetchEmployeeEvaluations(employee.identifier),
  ]);

  const now = new Date();

  const certTypeMap = new Map<string, I18nString>(
    certTypes.map((ct: { slug: string; name: I18nString }) => [
      ct.slug,
      ct.name,
    ]),
  );

  // Build competency data
  const positionRequirements: RequiredCompetency[] =
    getPositionRequirements(positionReqMap, employee.position) ?? [];
  const ratingMap = new Map<string, number | null>(
    employeeRatings.map((r: CompetencyRating) => [r.competencyId, r.rating]),
  );
  const requirementMap = new Map(
    positionRequirements.map((r: RequiredCompetency) => [r.competencyId, r]),
  );

  const relevantCompetencies = (
    competencies as unknown as CompetencyType[]
  ).filter((c) => {
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

  return (
    <div className="space-y-6">
      {/* Employee Info */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>
              {employee.firstName} {employee.lastName}
            </CardTitle>
            <div className="mt-1 space-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                {dict.myProfile.contractUntil}:{" "}
                {employee.endDate ? (
                  (() => {
                    const endDate = new Date(employee.endDate);
                    const daysUntil = Math.ceil(
                      (endDate.getTime() - now.getTime()) /
                        (1000 * 60 * 60 * 24),
                    );
                    return (
                      <Badge
                        variant={
                          daysUntil < 0
                            ? "statusRejected"
                            : daysUntil <= 30
                              ? "statusOverdue"
                              : daysUntil <= 90
                                ? "statusPending"
                                : "outline"
                        }
                        size="sm"
                      >
                        {formatDate(endDate)}
                      </Badge>
                    );
                  })()
                ) : (
                  <Badge variant="secondary" size="sm">
                    {dict.employees.permanent}
                  </Badge>
                )}
              </span>
              <p>
                {dict.employees.identifier}: {employee.identifier}
              </p>
              <p>
                {dict.employees.position}: {employee.position || "-"}
              </p>
              <p>
                {dict.employees.department}: {employee.department || "-"}
              </p>
              <p>
                {dict.employees.manager}: {employee.manager || "-"}
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
        <CardHeader>
          <CardTitle className="text-base">
            {dict.certifications.title}
          </CardTitle>
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
                      cert.expirationDate &&
                      new Date(cert.expirationDate as string) < now;
                    const isExpiringSoon =
                      cert.expirationDate &&
                      !isExpired &&
                      new Date(cert.expirationDate as string).getTime() -
                        now.getTime() <
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
                            ? new Date(
                                cert.issuedDate as string,
                              ).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {cert.expirationDate
                            ? new Date(
                                cert.expirationDate as string,
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

      {/* Competency Ratings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {dict.employees.competencyRatings}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {relevantCompetencies.length > 0 ? (
            <div className="space-y-6">
              {[...groupedByArea.entries()]
                .sort(
                  ([a], [b]) =>
                    PROCESS_AREAS.indexOf(a as (typeof PROCESS_AREAS)[number]) -
                    PROCESS_AREAS.indexOf(b as (typeof PROCESS_AREAS)[number]),
                )
                .map(([area, comps]) => (
                  <div key={area}>
                    <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
                      {localize(
                        PROCESS_AREA_LABELS[
                          area as keyof typeof PROCESS_AREA_LABELS
                        ],
                        safeLang,
                      )}
                    </h4>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{dict.competencies.name}</TableHead>
                            <TableHead className="w-28">
                              {dict.employees.employeeLevel}
                            </TableHead>
                            <TableHead className="w-28">
                              {dict.positions.requiredLevel}
                            </TableHead>
                            <TableHead className="w-20">
                              {dict.employees.gap}
                            </TableHead>
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
            <p className="text-sm text-muted-foreground">{dict.noData}</p>
          )}
        </CardContent>
      </Card>

      {/* Pending Self-Assessment */}
      {(() => {
        const pendingEval = evaluations.find(
          (ev: Record<string, unknown>) =>
            ev.status === "draft" && ev.selfAssessmentStatus === "pending",
        );
        if (!pendingEval) return null;
        return (
          <Card className="border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30">
            <CardHeader>
              <CardTitle className="text-base">
                {dict.evaluations.pendingSelfAssessment}
              </CardTitle>
              <CardDescription>
                {formatDate(
                  (pendingEval as Record<string, unknown>).periodFrom as
                    | string
                    | Date,
                )}{" "}
                -{" "}
                {formatDate(
                  (pendingEval as Record<string, unknown>).periodTo as
                    | string
                    | Date,
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href={`/${lang}/competency-matrix/evaluations/${((pendingEval as Record<string, unknown>)._id as string).toString()}/self`}
              >
                <Badge
                  variant="statusPending"
                  className="cursor-pointer text-sm px-3 py-1"
                >
                  {dict.evaluations.fillSelfAssessmentButton}
                </Badge>
              </Link>
            </CardContent>
          </Card>
        );
      })()}

      {/* Latest Evaluation */}
      {(() => {
        const latestEval = evaluations.find(
          (ev: Record<string, unknown>) =>
            ev.status === "approved" || ev.status === "submitted",
        );
        if (!latestEval) return null;
        const ev = latestEval as Record<string, unknown>;
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {dict.evaluations.latestEvaluation}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">
                    {dict.evaluations.period}:{" "}
                  </span>
                  {formatDate(ev.periodFrom as string | Date)} -{" "}
                  {formatDate(ev.periodTo as string | Date)}
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {dict.evaluations.assessor}:{" "}
                  </span>
                  {ev.assessorName as string}
                </div>
                {(ev.supervisorTotalPoints as number) > 0 && (
                  <Badge
                    variant={
                      ev.isPositive ? "statusApproved" : "statusRejected"
                    }
                    size="sm"
                  >
                    {dict.evaluations.grades[
                      ev.grade as keyof typeof dict.evaluations.grades
                    ] ?? ev.grade}
                  </Badge>
                )}
                <Link
                  href={`/${lang}/competency-matrix/evaluations/${(ev._id as string).toString()}`}
                  className="text-sm hover:underline"
                >
                  {dict.details}
                </Link>
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}
