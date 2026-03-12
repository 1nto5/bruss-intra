export const dynamic = "force-dynamic";

import { ObjectId } from "mongodb";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { dbc } from "@/lib/db/mongo";
import { Locale } from "@/lib/config/i18n";
import { getDictionary } from "../../../lib/dict";
import { COLLECTIONS } from "../../../lib/constants";
import {
  EDUCATION_LEVEL_LABELS,
  EXPERIENCE_LEVEL_LABELS,
} from "../../../lib/constants";
import { localize } from "../../../lib/types";
import type {
  EducationLevel,
  ExperienceLevel,
  I18nString,
} from "../../../lib/types";
import { fetchCertificationTypes } from "../../../lib/fetch-cert-types";
import { canManageCompetencies } from "../../../lib/permissions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function PositionDetailPage({
  params,
}: {
  params: Promise<{ lang: Locale; id: string }>;
}) {
  const { lang, id } = await params;
  const dict = await getDictionary(lang);
  const session = await auth();
  const safeLang = (["pl", "de", "en"].includes(lang) ? lang : "pl") as
    | "pl"
    | "de"
    | "en";

  if (!session || !session.user?.email) {
    redirect(`/${lang}/auth?callbackUrl=/competency-matrix/positions/${id}`);
  }

  const userRoles = session.user.roles ?? [];

  const [positionsColl, competenciesColl, employeesColl, certTypes] =
    await Promise.all([
      dbc(COLLECTIONS.positions),
      dbc(COLLECTIONS.competencies),
      dbc(COLLECTIONS.employees),
      fetchCertificationTypes(),
    ]);

  const certTypeMap = new Map<string, I18nString>(
    certTypes.map((ct) => [ct.slug, ct.name]),
  );

  const position = await positionsColl.findOne({ _id: new ObjectId(id) });
  if (!position) notFound();

  // Load competency details for display
  const competencyIds = (position.requiredCompetencies || []).map(
    (r: { competencyId: string }) => new ObjectId(r.competencyId),
  );

  const [competencies, employees] = await Promise.all([
    competencyIds.length > 0
      ? competenciesColl.find({ _id: { $in: competencyIds } }).toArray()
      : [],
    employeesColl
      .find({ position: position.name?.pl })
      .sort({ lastName: 1 })
      .toArray(),
  ]);

  const compMap = new Map(competencies.map((c) => [c._id.toString(), c]));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{localize(position.name, safeLang)}</CardTitle>
            <CardDescription>{position.department}</CardDescription>
          </div>
          {canManageCompetencies(userRoles) && (
            <Button asChild>
              <Link href={`/${lang}/competency-matrix/positions/${id}/edit`}>
                {dict.edit}
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">
              {dict.positions.requiredExperience}:{" "}
            </span>
            {localize(
              EXPERIENCE_LEVEL_LABELS[
                position.requiredExperience as ExperienceLevel
              ],
              safeLang,
            )}
          </div>
          <div>
            <span className="text-muted-foreground">
              {dict.positions.requiredEducation}:{" "}
            </span>
            {localize(
              EDUCATION_LEVEL_LABELS[
                position.requiredEducation as EducationLevel
              ],
              safeLang,
            )}
          </div>
          {position.requiredCertifications?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-muted-foreground">
                {dict.positions.requiredCertifications}:{" "}
              </span>
              {position.requiredCertifications.map((ct: string) => (
                <Badge key={ct} variant="outline" size="sm">
                  {localize(certTypeMap.get(ct), safeLang) || ct}
                </Badge>
              ))}
            </div>
          )}
          <div>
            <Badge
              variant={position.active ? "statusApproved" : "statusClosed"}
            >
              {position.active ? dict.active : dict.inactive}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Required Competencies */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {dict.positions.requiredCompetencies} (
            {position.requiredCompetencies?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {position.requiredCompetencies?.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{dict.competencies.name}</TableHead>
                    <TableHead>{dict.competencies.processArea}</TableHead>
                    <TableHead>{dict.positions.requiredLevel}</TableHead>
                    <TableHead>{dict.positions.weight}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {position.requiredCompetencies.map(
                    (req: {
                      competencyId: string;
                      requiredLevel: number;
                      weight: number;
                    }) => {
                      const comp = compMap.get(req.competencyId);
                      return (
                        <TableRow key={req.competencyId}>
                          <TableCell>
                            {comp
                              ? localize(comp.name, safeLang)
                              : req.competencyId}
                          </TableCell>
                          <TableCell>
                            {comp
                              ? dict.processAreas[
                                  comp.processArea as keyof typeof dict.processAreas
                                ]
                              : "-"}
                          </TableCell>
                          <TableCell>{req.requiredLevel}</TableCell>
                          <TableCell>{req.weight}</TableCell>
                        </TableRow>
                      );
                    },
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {dict.positions.noCompetenciesAssigned}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Employees in this position */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {dict.employees.title} ({employees.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{dict.employees.name}</TableHead>
                    <TableHead>{dict.employees.identifier}</TableHead>
                    <TableHead>{dict.employees.department}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp._id.toString()}>
                      <TableCell>
                        <Link
                          href={`/${lang}/competency-matrix/employees/${emp.identifier}`}
                          className="hover:underline"
                        >
                          {emp.firstName} {emp.lastName}
                        </Link>
                      </TableCell>
                      <TableCell>{emp.identifier}</TableCell>
                      <TableCell>{emp.department || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{dict.noData}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
