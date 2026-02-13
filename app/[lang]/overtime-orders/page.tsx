import LocalizedLink from '@/components/localized-link';
import NoAccess from '@/components/no-access';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { Locale } from '@/lib/config/i18n';
import { getDictionary as getGlobalDictionary } from '@/lib/dict';
import { getUsers } from '@/lib/data/get-users';
import getOvertimeDepartments from '@/lib/get-overtime-departments';
import { formatDateTime } from '@/lib/utils/date-format';
import { Plus } from 'lucide-react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TableFilteringAndOptions from './components/table-filtering';
import { createColumns } from './components/table/columns';
import { DataTable } from './components/table/data-table';
import { getDictionary } from './lib/dict';
import { hasOvertimeViewAccess } from './lib/overtime-roles';
import { OvertimeType } from './lib/types';

async function getOvertimeRequests(
  lang: string,
  searchParams: { [key: string]: string | undefined },
  userEmail?: string,
): Promise<{
  fetchTime: Date;
  fetchTimeLocaleString: string;
  overtimeRequestsLocaleString: OvertimeType[];
}> {
  const filteredSearchParams = Object.fromEntries(
    Object.entries(searchParams).filter(
      ([_, value]) => value !== undefined,
    ) as [string, string][],
  );

  // Add userEmail to query params for draft filtering on the server
  if (userEmail) {
    filteredSearchParams.userEmail = userEmail;
  }

  const cookieStore = await cookies();
  const queryParams = new URLSearchParams(filteredSearchParams).toString();
  const res = await fetch(`${process.env.API}/overtime-orders?${queryParams}`, {
    next: { revalidate: 0, tags: ['overtime-orders'] },
    headers: { cookie: cookieStore.toString() },
  });

  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `getOvertimeRequests error: ${res.status} ${res.statusText} ${json.error}`,
    );
  }

  const fetchTime = new Date(res.headers.get('date') || '');
  const fetchTimeLocaleString = formatDateTime(fetchTime);

  const overtimeRequestsLocaleString: OvertimeType[] = await res.json();
  return { fetchTime, fetchTimeLocaleString, overtimeRequestsLocaleString };
}

export default async function OvertimeOrdersPage(props: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await props.params;
  const { lang } = params;
  const searchParams = await props.searchParams;
  const dict = await getDictionary(lang);
  const session = await auth();

  if (!session) {
    redirect(`/${lang}/auth?callbackUrl=/${lang}/overtime-orders`);
  }

  if (!hasOvertimeViewAccess(session.user?.roles)) {
    const globalDict = await getGlobalDictionary(lang);
    return (
      <NoAccess
        title={globalDict.noAccessTitle}
        description={globalDict.noAccess}
      />
    );
  }

  const isGroupLeader = session.user?.roles?.includes('group-leader') || false;
  // Users with any role containing 'manager' (e.g., plant manager, logistics manager, etc.) can create requests
  const isManager =
    session.user?.roles?.some((role: string) => role.includes('manager')) || false;
  const canCreateRequest = isGroupLeader || isManager;
  const userEmail = session.user?.email || undefined;

  const { fetchTime, fetchTimeLocaleString, overtimeRequestsLocaleString } =
    await getOvertimeRequests(lang, searchParams, userEmail);

  const departments = await getOvertimeDepartments();
  const users = await getUsers();

  return (
    <Card>
      <CardHeader className='pb-2'>
        <div className='mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <CardTitle>{dict.page.title}</CardTitle>

          <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
            {canCreateRequest && (
              <LocalizedLink href='/overtime-orders/new-request'>
                <Button variant={'outline'} className='w-full sm:w-auto'>
                  <Plus /> <span>{dict.page.newRequest}</span>
                </Button>
              </LocalizedLink>
            )}
          </div>
        </div>
        <TableFilteringAndOptions
          fetchTime={fetchTime}
          isGroupLeader={isGroupLeader}
          isLogged={!!session}
          userEmail={session?.user?.email || undefined}
          dict={dict}
          departments={departments}
          users={users}
          lang={lang}
        />
      </CardHeader>
      <DataTable
        columns={createColumns}
        data={overtimeRequestsLocaleString}
        fetchTimeLocaleString={fetchTimeLocaleString}
        fetchTime={fetchTime}
        session={session}
        lang={lang}
        departments={departments}
        dict={dict}
      />
    </Card>
  );
}
