import LocalizedLink from '@/components/localized-link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { Locale } from '@/lib/config/i18n';
import { checkIfUserIsSupervisor } from '@/lib/data/check-user-supervisor-status';
import { getSubmissionSupervisors } from '@/lib/data/get-submission-supervisors';
import { getUsers } from '@/lib/data/get-users';
import { ArrowLeft } from 'lucide-react';
import { Session } from 'next-auth';
import { redirect } from 'next/navigation';
import { getDictionary } from '../../lib/dict';
import { OvertimeSubmissionType } from '../../lib/types';
import AllEntriesFilterCard from '../../components/all-entries-filter-card';
import EmployeeSubmissionsTable from '../../components/employee-submissions-table';

export const dynamic = 'force-dynamic';

async function getAllEntries(
  session: Session,
  searchParams: { [key: string]: string | undefined },
): Promise<{ fetchTime: Date; submissions: OvertimeSubmissionType[] }> {
  const params: Record<string, string> = {
    userEmail: session.user?.email || '',
  };

  // Add user roles
  if (session.user?.roles) {
    params.userRoles = session.user.roles.join(',');
  }

  // Add filters
  if (searchParams.id) params.id = searchParams.id;
  if (searchParams.status) params.status = searchParams.status;
  if (searchParams.year) params.year = searchParams.year;
  if (searchParams.month) params.month = searchParams.month;
  if (searchParams.week) params.week = searchParams.week;
  if (searchParams.employee) params.employee = searchParams.employee;
  if (searchParams.supervisor) params.supervisor = searchParams.supervisor;
  if (searchParams.onlyOrders) params.onlyOrders = searchParams.onlyOrders;
  if (searchParams.notOrders) params.notOrders = searchParams.notOrders;
  if (searchParams.notSettled) params.notSettled = searchParams.notSettled;
  if (searchParams.requiresMyApproval)
    params.requiresMyApproval = searchParams.requiresMyApproval;

  const queryParams = new URLSearchParams(params).toString();
  const res = await fetch(
    `${process.env.API}/overtime-submissions/all?${queryParams}`,
    {
      next: { revalidate: 0, tags: ['overtime-submissions'] },
    },
  );

  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `getAllEntries error: ${res.status} ${res.statusText} ${json.error}`,
    );
  }

  const fetchTime = new Date(res.headers.get('date') || '');
  const submissions: OvertimeSubmissionType[] = await res.json();
  return { fetchTime, submissions };
}

export default async function AllEntriesPage(props: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await props.params;
  const { lang } = params;
  const dict = await getDictionary(lang);
  const searchParams = await props.searchParams;
  const session = await auth();

  if (!session || !session.user?.email) {
    redirect(`/${lang}/auth?callbackUrl=/overtime-submissions/all-entries`);
  }

  const userRoles = session.user?.roles ?? [];
  const isAdmin = userRoles.includes('admin');
  const isHR = userRoles.includes('hr');
  const isPlantManager = userRoles.includes('plant-manager');
  const isManager = userRoles.some(
    (role: string) =>
      role.toLowerCase().includes('manager') ||
      role.toLowerCase().includes('group-leader'),
  );

  // Check access: role-based or supervisor-based
  let hasAccess = isManager || isHR || isAdmin || isPlantManager;
  if (!hasAccess && session.user?.email) {
    hasAccess = await checkIfUserIsSupervisor(session.user.email);
  }
  if (!hasAccess) {
    redirect(`/${lang}/overtime-submissions`);
  }

  const [{ fetchTime, submissions }, users, supervisors] = await Promise.all([
    getAllEntries(session, searchParams),
    getUsers(),
    getSubmissionSupervisors(),
  ]);

  // Build returnUrl for preserving filters when navigating to detail pages
  const searchParamsString = new URLSearchParams(
    Object.entries(searchParams).filter(([, v]) => v !== undefined) as [string, string][]
  ).toString();
  const returnUrl = searchParamsString
    ? `/overtime-submissions/all-entries?${searchParamsString}`
    : '/overtime-submissions/all-entries';

  return (
    <Card>
      <CardHeader className='pb-2'>
        <div className='mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <CardTitle>
            {dict.allEntriesPage?.pageTitle || 'All Overtime Entries'}
          </CardTitle>
          <LocalizedLink href='/overtime-submissions/balances'>
            <Button variant='outline' className='w-full sm:w-auto'>
              <ArrowLeft />
              {dict.balancesPage?.backToBalances || 'Employee balances'}
            </Button>
          </LocalizedLink>
        </div>

        <AllEntriesFilterCard
          users={users}
          supervisors={supervisors}
          dict={dict}
          fetchTime={fetchTime}
          showSupervisorFilter={isAdmin || isHR || isPlantManager}
          showNotSettledFilter={isAdmin || isHR}
          isPlantManager={isPlantManager}
        />
      </CardHeader>

      <EmployeeSubmissionsTable
        submissions={submissions}
        dict={dict}
        session={session}
        fetchTime={fetchTime}
        isAdmin={isAdmin}
        isHR={isHR}
        isPlantManager={isPlantManager}
        lang={lang}
        showEmployeeColumn={true}
        showSupervisorColumn={isAdmin || isHR || isPlantManager}
        returnUrl={returnUrl}
      />
    </Card>
  );
}
