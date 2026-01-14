import AccessDeniedAlert from '@/components/access-denied-alert';
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
import { Plus, Users } from 'lucide-react';
import { Session } from 'next-auth';
import { redirect } from 'next/navigation';
import OvertimeSummaryDisplay from './components/overtime-summary';
import TableFilteringAndOptions from './components/table-filtering-and-options';
import { createColumns } from './components/table/columns';
import { DataTable } from './components/table/data-table';
import { calculateSummaryFromSubmissions } from './lib/calculate-overtime';
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

  // Add allowed filters: status, year, month, week, onlyOrders, notOrders, id
  if (searchParams.status) params.status = searchParams.status;
  if (searchParams.year) params.year = searchParams.year;
  if (searchParams.month) params.month = searchParams.month;
  if (searchParams.week) params.week = searchParams.week;
  if (searchParams.onlyOrders) params.onlyOrders = searchParams.onlyOrders;
  if (searchParams.notOrders) params.notOrders = searchParams.notOrders;
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
    redirect('/auth?callbackUrl=/overtime-submissions');
  }

  // Allow access only for admin and hr roles (testing phase)
  const isAdmin = session?.user?.roles?.includes('admin') || false;
  const isHR = session?.user?.roles?.includes('hr') || false;
  if (!isAdmin && !isHR) {
    return <AccessDeniedAlert lang={lang} />;
  }

  // Anyone logged in can submit overtime hours
  const canCreateSubmission = !!session?.user?.email;

  const { fetchTime, overtimeSubmissionsLocaleString } =
    await getOvertimeSubmissions(session, searchParams);

  // Get user roles for balances page access
  const userRoles = session.user?.roles ?? [];
  const isManager = userRoles.some(
    (role: string) =>
      role.toLowerCase().includes('manager') ||
      role.toLowerCase().includes('group-leader'),
  );
  const isPlantManager = userRoles.includes('plant-manager');

  // Calculate overtime summary - always for logged-in user
  const selectedMonth = searchParams.month;
  const selectedYear = searchParams.year;

  const overtimeSummary = await calculateSummaryFromSubmissions(
    overtimeSubmissionsLocaleString,
    selectedMonth,
    selectedYear,
    searchParams.onlyOrders === 'true',
  );

  // Check if time filters are active (determines card display mode)
  const hasTimeFilters = !!(
    searchParams.year ||
    searchParams.month ||
    searchParams.week
  );

  // Show both cards (current month + all time) when no time filters
  const showBothCards = !hasTimeFilters;

  // Counts for toggle labels
  const ordersCount = overtimeSubmissionsLocaleString.filter(
    (s) => s.payment || s.scheduledDayOff,
  ).length;

  const notOrdersCount = overtimeSubmissionsLocaleString.filter(
    (s) => !s.payment && !s.scheduledDayOff,
  ).length;

  const onlyOrders = searchParams.onlyOrders === 'true';

  // Check if user can access balances page
  const canAccessBalances = isAdmin || isHR || isManager || isPlantManager;

  return (
    <Card>
      <CardHeader className='pb-2'>
        <div className='mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <CardTitle>{dict.pageTitle}</CardTitle>
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
                <LocalizedLink href='/overtime-submissions/add-overtime'>
                  <Button variant={'outline'} className='w-full sm:w-auto'>
                    <Plus /> <span>{dict.addOvertime}</span>
                  </Button>
                </LocalizedLink>
                <LocalizedLink href='/overtime-submissions/add-work-order'>
                  <Button variant={'outline'} className='w-full sm:w-auto'>
                    <Plus /> <span>{dict.addWorkOrder}</span>
                  </Button>
                </LocalizedLink>
              </>
            ) : null}
          </div>
        </div>
        <OvertimeSummaryDisplay
          overtimeSummary={overtimeSummary}
          dict={dict}
          showBothCards={showBothCards}
          onlyOrders={onlyOrders}
        />

        <TableFilteringAndOptions
          fetchTime={fetchTime}
          ordersCount={ordersCount}
          notOrdersCount={notOrdersCount}
          dict={dict}
        />
      </CardHeader>

      <DataTable
        columns={createColumns}
        data={overtimeSubmissionsLocaleString}
        fetchTime={fetchTime}
        session={session}
        dict={dict}
      />
    </Card>
  );
}
