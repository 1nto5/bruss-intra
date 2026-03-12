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
import { CompetencyTableFiltering } from "./components/table-filtering";
import { CompetencyTable } from "../../components/competencies/competency-table";

export default async function CompetenciesPage({
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
    redirect(`/${lang}/auth?callbackUrl=/competency-matrix/competencies`);
  }

  const userRoles = session.user.roles ?? [];
  if (!canManageCompetencies(userRoles)) {
    redirect(`/${lang}/competency-matrix`);
  }

  const resolvedSearchParams = await searchParams;

  const coll = await dbc(COLLECTIONS.competencies);

  // Build server-side filter
  const query: Record<string, unknown> = {};

  // Name filter (search across all locale variants)
  const nameParam =
    typeof resolvedSearchParams.name === "string"
      ? resolvedSearchParams.name
      : undefined;

  // Levels content filter
  const levelsParam =
    typeof resolvedSearchParams.levels === "string"
      ? resolvedSearchParams.levels
      : undefined;

  const orConditions: Record<string, unknown>[] = [];

  if (nameParam) {
    const regex = { $regex: nameParam, $options: "i" };
    orConditions.push(
      { "name.pl": regex },
      { "name.en": regex },
      { "name.de": regex },
    );
  }

  if (levelsParam) {
    const regex = { $regex: levelsParam, $options: "i" };
    orConditions.push(
      { "levels.1.pl": regex },
      { "levels.1.en": regex },
      { "levels.1.de": regex },
      { "levels.2.pl": regex },
      { "levels.2.en": regex },
      { "levels.2.de": regex },
      { "levels.3.pl": regex },
      { "levels.3.en": regex },
      { "levels.3.de": regex },
    );
  }

  if (nameParam && levelsParam) {
    // Both filters: must match name AND levels
    query.$and = [
      { $or: orConditions.slice(0, 3) },
      { $or: orConditions.slice(3) },
    ];
  } else if (orConditions.length > 0) {
    query.$or = orConditions;
  }

  const competencies = await coll
    .find(query)
    .sort({ processArea: 1 })
    .toArray();

  const serialized = competencies.map((c) => ({
    ...c,
    _id: c._id.toString(),
  })) as unknown as import("../../lib/types").CompetencyType[];

  const fetchTime = new Date();

  return (
    <Card>
      <CardHeader>
        <CompetencyTableFiltering dict={dict} fetchTime={fetchTime} />
      </CardHeader>
      <Separator />
      <CardContent>
        <CompetencyTable
          data={serialized}
          dict={dict}
          lang={lang}
          canEdit={canManageCompetencies(userRoles)}
          canDelete={canDeleteCompetencies(userRoles)}
          expandAll={!!levelsParam}
        />
      </CardContent>
    </Card>
  );
}
