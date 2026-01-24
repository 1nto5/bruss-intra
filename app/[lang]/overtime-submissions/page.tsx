import { EmployeeBalanceType } from '@/app/api/overtime-submissions/balances/route';
import LocalizedLink from '@/components/localized-link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { Locale } from '@/lib/config/i18n';
import { formatDateTime } from '@/lib/utils/date-format';
import { Banknote, Plus, Users } from 'lucide-react';
import { Session } from 'next-auth';
import { redirect } from 'next/navigation';
import OvertimeBalanceDisplay from './components/overtime-summary';
import TableFilteringAndOptions from './components/table-filtering-and-options';
import { createColumns } from './components/table/columns';
import { DataTable } from './components/table/data-table';
import { getDictionary } from './lib/dict';
import { OvertimeSubmissionType } from './lib/types';

export const dynamic = 'force-dynamic';

async function getOvertimeSubmissions(
  session: Session,
  searchParams: { [key: string]: string | undefined },
): Promise<{
  fetchTime: Date;
  fetchTimeLocaleString: string;
  overtimeSubmissionsLocaleString: OvertimeSubmissionType[];
}> {
  if (!session || !session.user?.email) {
    redirect('/auth?callbackUrl=/overtime-submissions');
  }

  // Build query params - only include allowed filters for personal view
  const params: Record<string, string> = {
    userEmail: session.user.email,
    // Always filter by own submissions on main page
    onlyMySubmissions: 'true',
  };

  // Add user roles for API authorization
  if (session.user.roles) {
    params.userRoles = session.user.roles.join(',');
  }

  // Add allowed filters: status, year, month, week, id
  if (searchParams.status) params.status = searchParams.status;
  if (searchParams.year) params.year = searchParams.year;
  if (searchParams.month) params.month = searchParams.month;
  if (searchParams.week) params.week = searchParams.week;
  if (searchParams.id) params.id = searchParams.id;

  const queryParams = new URLSearchParams(params).toString();
  const res = await fetch(
    `${process.env.API}/overtime-submissions?${queryParams}`,
    {
      next: { revalidate: 0, tags: ['overtime-submissions'] },
    },
  );

  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `getOvertimeSubmissions error: ${res.status} ${res.statusText} ${json.error}`,
    );
  }

  const fetchTime = new Date(res.headers.get('date') || '');
  const fetchTimeLocaleString = formatDateTime(fetchTime);

  const overtimeSubmissionsLocaleString: OvertimeSubmissionType[] =
    await res.json();

  return {
    fetchTime,
    fetchTimeLocaleString,
    overtimeSubmissionsLocaleString,
  };
}

export default async function OvertimePage(props: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await props.params;
  const { lang } = params;
  const dict = await getDictionary(lang);
  const searchParams = await props.searchParams;
  const session = await auth();

  if (!session || !session.user?.email) {
    redirect(`/${lang}/auth?callbackUrl=/overtime-submissions`);
  }

  // Anyone logged in can submit overtime hours
  const canCreateSubmission = !!session?.user?.email;

  const { fetchTime, overtimeSubmissionsLocaleString } =
    await getOvertimeSubmissions(session, searchParams);

  // Get user roles for balances page access
  const userRoles = session.user?.roles ?? [];
  const isAdmin = userRoles.includes('admin');
  const isHR = userRoles.includes('hr');
  const isManager = userRoles.some(
    (role: string) =>
      role.toLowerCase().includes('manager') ||
      role.toLowerCase().includes('group-leader'),
  );
  const isPlantManager = userRoles.includes('plant-manager');
  const isExternalUser = userRoles.includes('external-overtime-user');

  // Fetch overtime balance from API (approved, not settled)
  const balanceParams = new URLSearchParams({
    employee: session.user.email,
    status: 'pending,approved',
    userRoles: 'admin',
  });
  const balanceRes = await fetch(
    `${process.env.API}/overtime-submissions/balances?${balanceParams}`,
    { next: { revalidate: 0 } },
  );
  const balances: EmployeeBalanceType[] = balanceRes.ok ? await balanceRes.json() : [];
  const userBalance = balances.find((b) => b.email === session.user.email);
  const overtimeBalance = userBalance?.allTimeBalance ?? 0;

  // Check if user can access balances page (external users cannot)
  const canAccessBalances = !isExternalUser && (isAdmin || isHR || isManager || isPlantManager);

  // Build returnUrl for preserving filters when navigating to detail pages
  const searchParamsString = new URLSearchParams(
    Object.entries(searchParams).filter(([, v]) => v !== undefined) as [string, string][]
  ).toString();
  const returnUrl = searchParamsString
    ? `/overtime-submissions?${searchParamsString}`
    : '/overtime-submissions';

  return (
    <Card>
      <CardHeader className='pb-2'>
        <div className='mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex items-center gap-3'>
            <CardTitle>{dict.pageTitle}</CardTitle>
            <OvertimeBalanceDisplay balance={overtimeBalance} dict={dict} />
          </div>
          <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
            {canAccessBalances && (
              <LocalizedLink href='/overtime-submissions/balances'>
                <Button variant='outline' className='w-full sm:w-auto'>
                  <Users /> <span>{dict.balancesPage?.title || 'Balances'}</span>
                </Button>
              </LocalizedLink>
            )}
            {session && canCreateSubmission ? (
              <>
                {overtimeBalance > 0 && (
                  <LocalizedLink href='/overtime-submissions/request-payout'>
                    <Button variant='outline' className='w-full sm:w-auto'>
                      <Banknote /> <span>{dict.payoutRequest?.button || 'Payout Request'}</span>
                    </Button>
                  </LocalizedLink>
                )}
                <LocalizedLink href='/overtime-submissions/add-overtime'>
                  <Button variant='outline' className='w-full sm:w-auto'>
                    <Plus /> <span>{dict.addOvertime}</span>
                  </Button>
                </LocalizedLink>
              </>
            ) : null}
          </div>
        </div>

        <TableFilteringAndOptions fetchTime={fetchTime} dict={dict} />
      </CardHeader>

      <DataTable
        columns={createColumns}
        data={overtimeSubmissionsLocaleString}
        fetchTime={fetchTime}
        session={session}
        dict={dict}
        lang={lang}
        returnUrl={returnUrl}
      />
    </Card>
  );
}
