import AccessDeniedAlert from '@/components/access-denied-alert';
import LocalizedLink from '@/components/localized-link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { Locale } from '@/lib/config/i18n';
import { formatDateTime } from '@/lib/utils/date-format';
import { extractNameFromEmail } from '@/lib/utils/name-format';
import { ArrowLeft } from 'lucide-react';
import { Session } from 'next-auth';
import { redirect } from 'next/navigation';
import { getDictionary } from '../../../lib/dict';
import { OvertimeSubmissionType } from '../../../lib/types';
import EmployeeSubmissionsTable from '../../../components/employee-submissions-table';

export const dynamic = 'force-dynamic';

async function getEmployeeSubmissions(
  session: Session,
  employeeEmail: string,
  searchParams: { [key: string]: string | undefined },
): Promise<{
  fetchTime: Date;
  submissions: OvertimeSubmissionType[];
}> {
  const params: Record<string, string> = {
    userEmail: session.user?.email || '',
    employee: employeeEmail,
  };

  // Add user roles for API authorization
  if (session.user?.roles) {
    params.userRoles = session.user.roles.join(',');
  }

  // Add filters
  if (searchParams.status) params.status = searchParams.status;
  if (searchParams.year) params.year = searchParams.year;
  if (searchParams.month) params.month = searchParams.month;

  const queryParams = new URLSearchParams(params).toString();
  const res = await fetch(`${process.env.API}/overtime-submissions?${queryParams}`, {
    next: { revalidate: 0, tags: ['overtime-submissions'] },
  });

  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `getEmployeeSubmissions error: ${res.status} ${res.statusText} ${json.error}`,
    );
  }

  const fetchTime = new Date(res.headers.get('date') || '');
  const submissions: OvertimeSubmissionType[] = await res.json();

  return { fetchTime, submissions };
}

export default async function EmployeeDetailPage(props: {
  params: Promise<{ lang: Locale; user_id: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
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

  const employeeEmail = decodeURIComponent(user_id);
  const employeeName = extractNameFromEmail(employeeEmail);

  const { fetchTime, submissions } = await getEmployeeSubmissions(
    session,
    employeeEmail,
    searchParams,
  );

  // Calculate total balance
  const totalHours = submissions
    .filter((s) => s.status !== 'cancelled')
    .reduce((sum, s) => sum + (s.hours || 0), 0);

  // Get unique supervisor for this employee
  const supervisor =
    submissions.length > 0
      ? extractNameFromEmail(submissions[0].supervisor)
      : '-';

  const title =
    dict.balancesPage?.employeeDetailTitle?.replace('{name}', employeeName) ||
    `Overtime for ${employeeName}`;

  return (
    <Card>
      <CardHeader className='pb-2'>
        <div className='mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription className='mt-1'>
              {dict.balancesPage?.supervisor || 'Supervisor'}: {supervisor} |{' '}
              {dict.balancesPage?.totalHours || 'Balance'}:{' '}
              <span
                className={`font-semibold ${totalHours < 0 ? 'text-red-600' : totalHours > 0 ? 'text-green-600' : ''}`}
              >
                {totalHours > 0 ? '+' : ''}
                {totalHours}h
              </span>
            </CardDescription>
          </div>
          <LocalizedLink href='/overtime-submissions/balances'>
            <Button variant='outline' className='w-full sm:w-auto'>
              <ArrowLeft className='mr-2 h-4 w-4' />
              {dict.balancesPage?.backToSubmissions || 'Back to balances'}
            </Button>
          </LocalizedLink>
        </div>
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
      />
    </Card>
  );
}
