export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { dbc } from "@/lib/db/mongo";
import { Locale } from "@/lib/config/i18n";
import { getDictionary } from "../../../lib/dict";
import { COLLECTIONS } from "../../../lib/constants";
import { hasFullAccess, canSupervisorAssess } from "../../../lib/permissions";
import { EvaluationForm } from "../../../components/evaluations/evaluation-form";
import getEmployees from "@/lib/data/get-employees";

export default async function CreateEvaluationPage({
  params,
  searchParams: searchParamsPromise,
}: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang } = await params;
  const resolvedSearchParams = await searchParamsPromise;
  const dict = await getDictionary(lang);
  const session = await auth();

  if (!session || !session.user?.email) {
    redirect(`/${lang}/auth?callbackUrl=/competency-matrix/evaluations/create`);
  }

  const userRoles = session.user.roles ?? [];
  if (!canSupervisorAssess(userRoles) && !hasFullAccess(userRoles)) {
    redirect(`/${lang}/competency-matrix/evaluations`);
  }

  // Pre-fill employee data if identifier provided
  const employeeIdentifier =
    typeof resolvedSearchParams.employee === "string"
      ? resolvedSearchParams.employee
      : undefined;

  let prefillEmployee = null;
  let periodOptions: Array<{
    _id: string;
    name: string;
    type: string;
    startDate: string;
    endDate: string;
  }> = [];

  if (employeeIdentifier) {
    const [employeesColl, periodsColl] = await Promise.all([
      dbc(COLLECTIONS.employees),
      dbc(COLLECTIONS.evaluationPeriods),
    ]);
    const employee = await employeesColl.findOne({
      identifier: employeeIdentifier,
    });
    if (employee) {
      prefillEmployee = {
        identifier: employee.identifier,
        name: `${employee.firstName} ${employee.lastName}`,
        position: employee.position || "",
        department: employee.department || "",
      };
    }

    // Fetch evaluation periods assigned to this employee
    const periods = await periodsColl
      .find({ employeeIdentifiers: employeeIdentifier })
      .sort({ startDate: -1 })
      .toArray();

    periodOptions = periods.map((p) => ({
      _id: p._id.toString(),
      name: p.name,
      type: p.type,
      startDate:
        p.startDate instanceof Date
          ? p.startDate.toISOString()
          : String(p.startDate),
      endDate:
        p.endDate instanceof Date ? p.endDate.toISOString() : String(p.endDate),
    }));
  }

  // Fetch employee options for combobox (when no prefill)
  const employees = prefillEmployee ? [] : await getEmployees();
  const employeeOptions = employees.map((e) => ({
    value: e.identifier,
    label: `${e.lastName} ${e.firstName} (${e.identifier})`,
  }));

  return (
    <EvaluationForm
      dict={dict}
      lang={lang}
      employees={employeeOptions}
      defaultEmployee={employeeIdentifier}
      prefillEmployee={prefillEmployee}
      periodOptions={periodOptions}
    />
  );
}
