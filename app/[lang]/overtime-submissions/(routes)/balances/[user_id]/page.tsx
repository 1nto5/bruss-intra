import LocalizedLink from "@/components/localized-link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { Locale } from "@/lib/config/i18n";
import { checkIfUserIsSupervisor } from "@/lib/data/check-user-supervisor-status";
import { dbc } from "@/lib/db/mongo";
import { extractNameFromEmail } from "@/lib/utils/name-format";
import { ArrowLeft } from "lucide-react";
import { ObjectId } from "mongodb";
import { Session } from "next-auth";
import { notFound, redirect } from "next/navigation";
import EmployeeFilterCard from "../../../components/employee-filter-card";
import EmployeeSubmissionsTable from "../../../components/employee-submissions-table";
import { getDictionary } from "../../../lib/dict";
import { OvertimeSubmissionType } from "../../../lib/types";

export const dynamic = "force-dynamic";

async function getUserById(userId: string): Promise<{ email: string } | null> {
  try {
    const coll = await dbc("users");
    const user = await coll.findOne(
      { _id: new ObjectId(userId) },
      { projection: { email: 1 } },
    );
    return user ? { email: user.email } : null;
  } catch {
    return null;
  }
}

interface SearchParams {
  [key: string]: string | undefined;
  returnUrl?: string;
}

async function getEmployeeSubmissions(
  session: Session,
  employeeEmail: string,
  searchParams: SearchParams,
): Promise<{
  fetchTime: Date;
  submissions: OvertimeSubmissionType[];
}> {
  const params: Record<string, string> = {
    userEmail: session.user?.email || "",
    employee: employeeEmail,
  };

  // Add user roles for API authorization
  if (session.user?.roles) {
    params.userRoles = session.user.roles.join(",");
  }

  // Add filters
  if (searchParams.status) params.status = searchParams.status;
  if (searchParams.year) params.year = searchParams.year;
  if (searchParams.month) params.month = searchParams.month;
  if (searchParams.week) params.week = searchParams.week;
  if (searchParams.id) params.id = searchParams.id;

  const queryParams = new URLSearchParams(params).toString();
  const res = await fetch(
    `${process.env.API}/overtime-submissions?${queryParams}`,
    {
      next: { revalidate: 0, tags: ["overtime-submissions"] },
    },
  );

  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `getEmployeeSubmissions error: ${res.status} ${res.statusText} ${json.error}`,
    );
  }

  const fetchTime = new Date(res.headers.get("date") || "");
  const submissions: OvertimeSubmissionType[] = await res.json();

  return { fetchTime, submissions };
}

export default async function EmployeeDetailPage(props: {
  params: Promise<{ lang: Locale; user_id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const params = await props.params;
  const { lang, user_id } = params;
  const dict = await getDictionary(lang);
  const searchParams = await props.searchParams;
  const session = await auth();

  if (!session || !session.user?.email) {
    redirect(
      `/${lang}/auth?callbackUrl=${encodeURIComponent(`/overtime-submissions/balances/${user_id}`)}`,
    );
  }

  const userRoles = session.user?.roles ?? [];
  const isAdmin = userRoles.includes("admin");
  const isHR = userRoles.includes("hr");
  const isPlantManager = userRoles.includes("plant-manager");
  const isManager = userRoles.some(
    (role: string) =>
      role.toLowerCase().includes("manager") ||
      role.toLowerCase().includes("group-leader"),
  );

  // Check access: role-based or supervisor-based
  let hasAccess = isManager || isHR || isAdmin || isPlantManager;
  if (!hasAccess && session.user?.email) {
    hasAccess = await checkIfUserIsSupervisor(session.user.email);
  }
  if (!hasAccess) {
    redirect(`/${lang}/overtime-submissions`);
  }

  // Look up user by _id
  const user = await getUserById(user_id);
  if (!user) {
    notFound();
  }

  const employeeEmail = user.email;
  const employeeName = extractNameFromEmail(employeeEmail);

  const { fetchTime, submissions } = await getEmployeeSubmissions(
    session,
    employeeEmail,
    searchParams,
  );

  // Calculate total balance (exclude cancelled submissions)
  const totalHours = submissions
    .filter((s) => s.status !== "cancelled")
    .reduce((sum, s) => sum + (s.hours || 0), 0);

  // Get unique supervisor for this employee
  const supervisor =
    submissions.length > 0
      ? extractNameFromEmail(submissions[0].supervisor)
      : "-";

  const title =
    dict.balancesPage?.employeeDetailTitle?.replace("{name}", employeeName) ||
    `Overtime for ${employeeName}`;

  // Use returnUrl from searchParams if available, otherwise default to balances
  const backUrl = searchParams.returnUrl
    ? decodeURIComponent(searchParams.returnUrl)
    : '/overtime-submissions/balances';

  // Build returnUrl for EmployeeSubmissionsTable (for navigating to details)
  const { returnUrl: _, ...filterParams } = searchParams;
  const filterParamsString = new URLSearchParams(
    Object.entries(filterParams).filter(([, v]) => v !== undefined) as [string, string][]
  ).toString();
  const tableReturnUrl = filterParamsString
    ? `/overtime-submissions/balances/${user_id}?${filterParamsString}`
    : `/overtime-submissions/balances/${user_id}`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-1">
              {dict.balancesPage?.supervisor || "Supervisor"}: {supervisor} |{" "}
              {dict.balancesPage?.allTimeBalance || "Balance"}:{" "}
              <span
                className={`font-semibold ${totalHours !== 0 ? "text-red-600" : ""}`}
              >
                {totalHours > 0 ? "+" : ""}
                {totalHours}h
              </span>
            </CardDescription>
          </div>
          <LocalizedLink href={backUrl}>
            <Button variant="outline" className="w-full sm:w-auto">
              <ArrowLeft className="" />
              {dict.balancesPage?.backToBalances || "Employee balances"}
            </Button>
          </LocalizedLink>
        </div>

        <EmployeeFilterCard dict={dict} fetchTime={fetchTime} />
      </CardHeader>

      <EmployeeSubmissionsTable
        submissions={submissions}
        dict={dict}
        session={session}
        fetchTime={fetchTime}
        employeeEmail={employeeEmail}
        isAdmin={isAdmin}
        isHR={isHR}
        isPlantManager={isPlantManager}
        lang={lang}
        returnUrl={tableReturnUrl}
      />
    </Card>
  );
}
