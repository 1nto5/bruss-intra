import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Locale } from "@/lib/config/i18n";
import { getDictionary } from "../../../../lib/dict";
import { hasFullAccess } from "../../../../lib/permissions";
import { EvaluationPeriodForm } from "../../../../components/settings/evaluation-period-form";
import getEmployees from "@/lib/data/get-employees";

export default async function AddEvaluationPeriodPage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  const [dict, session, employees] = await Promise.all([
    getDictionary(lang),
    auth(),
    getEmployees(),
  ]);

  if (!session || !session.user?.email) {
    redirect(
      `/${lang}/auth?callbackUrl=/competency-matrix/settings/evaluation-periods/add`,
    );
  }

  const userRoles = session.user.roles ?? [];
  if (!hasFullAccess(userRoles)) {
    redirect(`/${lang}/competency-matrix`);
  }

  const employeeOptions = employees.map((e) => ({
    value: e.identifier,
    label: `${e.lastName} ${e.firstName} (${e.identifier})`,
  }));

  return (
    <EvaluationPeriodForm
      dict={dict}
      lang={lang}
      employeeOptions={employeeOptions}
    />
  );
}
