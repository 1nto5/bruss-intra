import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { dbc } from "@/lib/db/mongo";
import { Locale } from "@/lib/config/i18n";
import { getDictionary } from "../../../../../lib/dict";
import { COLLECTIONS } from "../../../../../lib/constants";
import { hasFullAccess } from "../../../../../lib/permissions";
import { EvaluationPeriodForm } from "../../../../../components/settings/evaluation-period-form";
import getEmployees from "@/lib/data/get-employees";

export default async function EditEvaluationPeriodPage({
  params,
}: {
  params: Promise<{ lang: Locale; id: string }>;
}) {
  const { lang, id } = await params;
  const [dict, session, employees] = await Promise.all([
    getDictionary(lang),
    auth(),
    getEmployees(),
  ]);

  if (!session || !session.user?.email) {
    redirect(
      `/${lang}/auth?callbackUrl=/competency-matrix/settings/evaluation-periods/${id}/edit`,
    );
  }

  const userRoles = session.user.roles ?? [];
  if (!hasFullAccess(userRoles)) {
    redirect(`/${lang}/competency-matrix`);
  }

  const coll = await dbc(COLLECTIONS.evaluationPeriods);
  const doc = await coll.findOne({ _id: new ObjectId(id) });
  if (!doc) notFound();

  const period = {
    _id: doc._id.toString(),
    name: doc.name,
    type: doc.type,
    startDate: doc.startDate,
    endDate: doc.endDate,
    employeeIdentifiers: doc.employeeIdentifiers || [],
  };

  const employeeOptions = employees.map((e) => ({
    value: e.identifier,
    label: `${e.lastName} ${e.firstName} (${e.identifier})`,
  }));

  return (
    <EvaluationPeriodForm
      dict={dict}
      lang={lang}
      period={period}
      employeeOptions={employeeOptions}
    />
  );
}
