import LocalizedLink from '@/components/localized-link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { Locale } from '@/lib/config/i18n';
import { plant } from '@/lib/config/plant';
import { dbc } from '@/lib/db/mongo';
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

  const coll = await dbc('employees');
  const query: Record<string, unknown> = {};

  if (searchParams.search) {
    const regex = { $regex: searchParams.search, $options: 'i' };
    query.$or = [
      { identifier: regex },
      { firstName: regex },
      { lastName: regex },
    ];
  }

  const employees = await coll
    .find(query)
    .sort({ lastName: 1, firstName: 1 })
    .toArray();

  const fetchTime = new Date();

  const data: ManagedEmployee[] = employees.map((e) => ({
    _id: e._id.toString(),
    identifier: e.identifier,
    firstName: e.firstName,
    lastName: e.lastName,
    createdAt: e.createdAt,
    createdBy: e.createdBy,
    editedAt: e.editedAt,
    editedBy: e.editedBy,
  }));

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
      <DataTable columns={createColumns} data={data} session={session} dict={dict} />
    </Card>
  );
}
