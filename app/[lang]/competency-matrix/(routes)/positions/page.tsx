export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { dbc } from "@/lib/db/mongo";
import { Locale } from "@/lib/config/i18n";
import { getDictionary } from "../../lib/dict";
import { COLLECTIONS } from "../../lib/constants";
import {
  canManageCompetencies,
  canDeleteCompetencies,
} from "../../lib/permissions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PositionTableFiltering } from "./components/table-filtering";
import { PositionTable } from "../../components/positions/position-table";

export default async function PositionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const session = await auth();

  if (!session || !session.user?.email) {
    redirect(`/${lang}/auth?callbackUrl=/competency-matrix/positions`);
  }

  const userRoles = session.user.roles ?? [];
  if (!canManageCompetencies(userRoles)) {
    redirect(`/${lang}/competency-matrix`);
  }

  const resolvedSearchParams = await searchParams;

  const [positionsColl, employeesColl] = await Promise.all([
    dbc(COLLECTIONS.positions),
    dbc(COLLECTIONS.employees),
  ]);

  // Build server-side filter for positions
  const query: Record<string, unknown> = {};

  const nameParam =
    typeof resolvedSearchParams.name === "string"
      ? resolvedSearchParams.name
      : undefined;
  if (nameParam) {
    query.$or = [
      { "name.pl": { $regex: nameParam, $options: "i" } },
      { "name.en": { $regex: nameParam, $options: "i" } },
      { "name.de": { $regex: nameParam, $options: "i" } },
    ];
  }

  const deptParam =
    typeof resolvedSearchParams.department === "string"
      ? resolvedSearchParams.department
      : undefined;
  if (deptParam) {
    const departments = deptParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (departments.length > 0) {
      query.department = { $in: departments };
    }
  }

  const [positions, employeeCounts] = await Promise.all([
    positionsColl.find(query).sort({ department: 1, "name.pl": 1 }).toArray(),
    employeesColl
      .aggregate([
        { $match: { position: { $ne: null } } },
        { $group: { _id: "$position", count: { $sum: 1 } } },
      ])
      .toArray(),
  ]);

  const countMap = new Map(
    employeeCounts.map((e) => [e._id as string, e.count as number]),
  );

  const serialized = positions.map((p) => ({
    ...p,
    _id: p._id.toString(),
    employeeCount: countMap.get(p.name?.pl) ?? 0,
  })) as unknown as (import("../../lib/types").PositionType & {
    employeeCount: number;
  })[];

  // Get all unique departments for filter options (from ALL positions, not just filtered)
  const allPositions = await positionsColl
    .find({})
    .project({ department: 1 })
    .toArray();
  const departments = [
    ...new Set(allPositions.map((p) => p.department as string).filter(Boolean)),
  ].sort();
  const departmentOptions = departments.map((d) => ({ value: d, label: d }));

  const fetchTime = new Date();

  return (
    <Card>
      <CardHeader>
        <PositionTableFiltering
          dict={dict}
          departmentOptions={departmentOptions}
          fetchTime={fetchTime}
        />
      </CardHeader>
      <Separator />
      <CardContent>
        <PositionTable
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
