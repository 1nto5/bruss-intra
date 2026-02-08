import LocalizedLink from '@/components/localized-link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { Locale } from '@/lib/config/i18n';
import { dbc } from '@/lib/db/mongo';
import { Plus } from 'lucide-react';
import { redirect } from 'next/navigation';
import TableFiltering from './components/table-filtering';
import { createColumns } from './components/table/columns';
import { DataTable } from './components/table/data-table';
import { getDictionary } from './lib/dict';
import { DmcheckConfigFull } from './lib/types';

export const dynamic = 'force-dynamic';

export default async function DmcheckConfigsPage(props: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { lang } = await props.params;
  const searchParams = await props.searchParams;
  const dict = await getDictionary(lang);
  const session = await auth();

  if (!session || !session.user?.email) {
    redirect(`/${lang}/auth?callbackUrl=/dmcheck-configs`);
  }

  if (!session.user.roles?.includes('admin')) {
    redirect(`/${lang}`);
  }

  const coll = await dbc('dmcheck_configs');
  const query: Record<string, unknown> = {};

  if (searchParams.workplace) {
    query.workplace = searchParams.workplace;
  }

  if (searchParams.search) {
    const regex = { $regex: searchParams.search, $options: 'i' };
    query.$or = [{ articleNumber: regex }, { articleName: regex }];
  }

  const configs = await coll
    .find(query)
    .sort({ workplace: 1, articleNumber: 1 })
    .toArray();

  const fetchTime = new Date();

  const data: DmcheckConfigFull[] = configs.map((c) => ({
    ...c,
    _id: c._id.toString(),
  })) as DmcheckConfigFull[];

  return (
    <Card>
      <CardHeader className='pb-2'>
        <div className='mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <CardTitle>{dict.pageTitle}</CardTitle>
          <LocalizedLink href='/dmcheck-configs/add'>
            <Button variant='outline'>
              <Plus /> <span>{dict.addConfig}</span>
            </Button>
          </LocalizedLink>
        </div>
        <TableFiltering fetchTime={fetchTime} dict={dict} />
      </CardHeader>
      <DataTable
        columns={createColumns}
        data={data}
        session={session}
        dict={dict}
      />
    </Card>
  );
}
