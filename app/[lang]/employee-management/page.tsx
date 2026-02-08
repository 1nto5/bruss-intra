import LocalizedLink from '@/components/localized-link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { Locale } from '@/lib/config/i18n';
import { plant } from '@/lib/config/plant';
import { Plus } from 'lucide-react';
import { redirect } from 'next/navigation';
import TableFiltering from './components/table-filtering';
import { createColumns } from './components/table/columns';
import { DataTable } from './components/table/data-table';
import { getDictionary } from './lib/dict';
import { ManagedEmployee } from './lib/types';

export const dynamic = 'force-dynamic';

export default async function EmployeeManagementPage(props: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { lang } = await props.params;
  const searchParams = await props.searchParams;
  const dict = await getDictionary(lang);
  const session = await auth();

  if (!session || !session.user?.email) {
    redirect(`/${lang}/auth?callbackUrl=/employee-management`);
  }

  if (!session.user.roles?.includes('admin')) {
    redirect(`/${lang}`);
  }

  if (plant !== 'bri') {
    redirect(`/${lang}`);
  }

  const params = new URLSearchParams({
    userRoles: session.user.roles.join(','),
    managed: 'true',
  });
  if (searchParams.search) params.set('search', searchParams.search);

  const res = await fetch(
    `${process.env.API}/employees?${params}`,
    {
      next: { revalidate: 0, tags: ['employees'] },
    },
  );

  if (!res.ok) {
    throw new Error(`employees fetch error: ${res.status}`);
  }

  const fetchTime = new Date(res.headers.get('date') || '');
  const data: ManagedEmployee[] = await res.json();

  return (
    <Card>
      <CardHeader className='pb-2'>
        <div className='mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <CardTitle>{dict.pageTitle}</CardTitle>
          <LocalizedLink href='/employee-management/add'>
            <Button variant='outline'>
              <Plus /> <span>{dict.addEmployee}</span>
            </Button>
          </LocalizedLink>
        </div>
        <TableFiltering fetchTime={fetchTime} dict={dict} />
      </CardHeader>
      <DataTable
        columns={createColumns}
        data={data}
        fetchTime={fetchTime}
        session={session}
        dict={dict}
      />
    </Card>
  );
}
