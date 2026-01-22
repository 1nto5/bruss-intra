import LocalizedLink from '@/components/localized-link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { Locale } from '@/lib/config/i18n';
import { checkIfUserIsSupervisor } from '@/lib/data/check-user-supervisor-status';
import { getSubmissionSupervisors } from '@/lib/data/get-submission-supervisors';
import { getUsers } from '@/lib/data/get-users';
import { ArrowLeft, List } from 'lucide-react';
import { Session } from 'next-auth';
import { redirect } from 'next/navigation';
import { EmployeeBalanceType } from '@/app/api/overtime-submissions/balances/route';
import { getDictionary } from '../../lib/dict';
import BalancesFilterCard from '../../components/balances-filter-card';
import BalancesTable from '../../components/balances-table';

export const dynamic = 'force-dynamic';

async function getEmployeeBalances(
  session: Session,
  searchParams: { [key: string]: string | undefined },
): Promise<{ fetchTime: Date; balances: EmployeeBalanceType[] }> {
  const params: Record<string, string> = {
    userEmail: session.user?.email || '',
  };

  // Add user roles
  if (session.user?.roles) {
    params.userRoles = session.user.roles.join(',');
  }

  // Add filters
  if (searchParams.status) params.status = searchParams.status;
  if (searchParams.year) params.year = searchParams.year;
  if (searchParams.month) params.month = searchParams.month;
  if (searchParams.week) params.week = searchParams.week;
  if (searchParams.employee) params.employee = searchParams.employee;
  if (searchParams.supervisor) params.supervisor = searchParams.supervisor;
  if (searchParams.name) params.name = searchParams.name;

  const queryParams = new URLSearchParams(params).toString();
  const res = await fetch(
    `${process.env.API}/overtime-submissions/balances?${queryParams}`,
    {
      next: { revalidate: 0, tags: ['overtime-submissions', 'balances'] },
    },
  );

  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `getEmployeeBalances error: ${res.status} ${res.statusText} ${json.error}`,
    );
  }

  const fetchTime = new Date(res.headers.get('date') || '');
  const balances: EmployeeBalanceType[] = await res.json();
  return { fetchTime, balances };
}

export default async function BalancesPage(props: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await props.params;
  const { lang } = params;
  const dict = await getDictionary(lang);
  const searchParams = await props.searchParams;
  const session = await auth();

  if (!session || !session.user?.email) {
    redirect(`/${lang}/auth?callbackUrl=/overtime-submissions/balances`);
  }

  const userRoles = session.user?.roles ?? [];
  const isAdmin = userRoles.includes('admin');
  const isHR = userRoles.includes('hr');
  const isPlantManager = userRoles.includes('plant-manager');
  const isExternalUser = userRoles.includes('external-overtime-user');
  const isManager = userRoles.some(
    (role: string) =>
      role.toLowerCase().includes('manager') ||
      role.toLowerCase().includes('group-leader'),
  );

  // External users cannot access balances page
  if (isExternalUser) {
    redirect(`/${lang}/overtime-submissions`);
  }

  // Check access: role-based or supervisor-based
  let hasAccess = isManager || isHR || isAdmin || isPlantManager;
  if (!hasAccess && session.user?.email) {
    hasAccess = await checkIfUserIsSupervisor(session.user.email);
  }
  if (!hasAccess) {
    redirect(`/${lang}/overtime-submissions`);
  }

  const [{ fetchTime, balances }, users, supervisors] = await Promise.all([
    getEmployeeBalances(session, searchParams),
    getUsers(),
    getSubmissionSupervisors(),
  ]);

  // Apply toggle filters
  let filteredBalances = balances;
  if (searchParams.onlyPending === 'true') {
    filteredBalances = filteredBalances.filter((b) => b.pendingCount > 0);
  }
  if (searchParams.onlyNonZero === 'true') {
    filteredBalances = filteredBalances.filter((b) => b.allTimeBalance !== 0);
  }
  if (searchParams.onlyUnsettled === 'true') {
    filteredBalances = filteredBalances.filter((b) => b.unaccountedCount > 0);
  }

  // Build returnUrl for preserving filters when navigating to employee details
  const searchParamsString = new URLSearchParams(
    Object.entries(searchParams).filter(([, v]) => v !== undefined) as [string, string][]
  ).toString();
  const returnUrl = searchParamsString
    ? `/overtime-submissions/balances?${searchParamsString}`
    : '/overtime-submissions/balances';

  return (
    <Card>
      <CardHeader className='pb-2'>
        <div className='mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <CardTitle>
            {dict.balancesPage?.pageTitle || 'Employee Overtime Balances'}
          </CardTitle>
          <div className='flex flex-col gap-2 sm:flex-row'>
            <LocalizedLink href='/overtime-submissions/all-entries'>
              <Button variant='outline' className='w-full sm:w-auto'>
                <List />
                {dict.allEntriesPage?.title || 'All Entries'}
              </Button>
            </LocalizedLink>
            <LocalizedLink href='/overtime-submissions'>
              <Button variant='outline' className='w-full sm:w-auto'>
                <ArrowLeft />
                {dict.balancesPage?.myOvertime || 'My overtime'}
              </Button>
            </LocalizedLink>
          </div>
        </div>

        <BalancesFilterCard
          users={users}
          supervisors={supervisors}
          dict={dict}
          fetchTime={fetchTime}
          showSupervisorFilter={isAdmin || isHR || isPlantManager}
        />
      </CardHeader>

      <BalancesTable
        balances={filteredBalances}
        dict={dict}
        session={session}
        isAdmin={isAdmin}
        isHR={isHR}
        isPlantManager={isPlantManager}
        lang={lang}
        returnUrl={returnUrl}
      />
    </Card>
  );
}
