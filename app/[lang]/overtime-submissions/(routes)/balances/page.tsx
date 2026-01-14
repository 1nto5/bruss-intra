import AccessDeniedAlert from '@/components/access-denied-alert';
import LocalizedLink from '@/components/localized-link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { Locale } from '@/lib/config/i18n';
import { getUsers } from '@/lib/data/get-users';
import { ArrowLeft } from 'lucide-react';
import { Session } from 'next-auth';
import { redirect } from 'next/navigation';
import { EmployeeBalanceType } from '@/app/api/overtime-submissions/balances/route';
import { getDictionary } from '../../lib/dict';
import BalancesTable from '../../components/balances-table';

export const dynamic = 'force-dynamic';

async function getEmployeeBalances(
  session: Session,
  searchParams: { [key: string]: string | undefined },
): Promise<EmployeeBalanceType[]> {
  const params: Record<string, string> = {};

  // Add filters
  if (searchParams.status) params.status = searchParams.status;
  if (searchParams.year) params.year = searchParams.year;
  if (searchParams.month) params.month = searchParams.month;
  if (searchParams.employee) params.employee = searchParams.employee;
  if (searchParams.supervisor) params.supervisor = searchParams.supervisor;

  const queryParams = new URLSearchParams(params).toString();
  const res = await fetch(
    `${process.env.API}/overtime-submissions/balances?${queryParams}`,
    {
      headers: {
        Cookie: `next-auth.session-token=${session.user?.email}`,
      },
      next: { revalidate: 0, tags: ['overtime-submissions', 'balances'] },
    },
  );

  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `getEmployeeBalances error: ${res.status} ${res.statusText} ${json.error}`,
    );
  }

  return res.json();
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
  const isManager = userRoles.some(
    (role: string) =>
      role.toLowerCase().includes('manager') ||
      role.toLowerCase().includes('group-leader'),
  );

  // Only managers, HR, admin, plant-manager can access
  if (!isManager && !isHR && !isAdmin && !isPlantManager) {
    return <AccessDeniedAlert lang={lang} />;
  }

  const balances = await getEmployeeBalances(session, searchParams);
  const users = await getUsers();

  // Get unique supervisors from balances for filter
  const supervisorEmails = [...new Set(balances.map((b) => b.latestSupervisor))];

  return (
    <Card>
      <CardHeader className='pb-2'>
        <div className='mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <CardTitle>
            {dict.balancesPage?.pageTitle || 'Employee Overtime Balances'}
          </CardTitle>
          <LocalizedLink href='/overtime-submissions'>
            <Button variant='outline' className='w-full sm:w-auto'>
              <ArrowLeft className='mr-2 h-4 w-4' />
              {dict.balancesPage?.backToSubmissions || 'Back to submissions'}
            </Button>
          </LocalizedLink>
        </div>
      </CardHeader>

      <BalancesTable
        balances={balances}
        dict={dict}
        session={session}
        users={users}
        supervisorEmails={supervisorEmails}
        isAdmin={isAdmin}
        isHR={isHR}
        isPlantManager={isPlantManager}
        lang={lang}
      />
    </Card>
  );
}
