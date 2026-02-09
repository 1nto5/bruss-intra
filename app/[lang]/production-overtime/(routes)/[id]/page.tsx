// import { auth } from '@/lib/auth';
import LocalizedLink from '@/components/localized-link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Locale } from '@/lib/config/i18n';
import { Table } from 'lucide-react';
import { DataTableWrapper } from '../../components/employees-table/data-table-wrapper';
import { getDictionary } from '../../lib/dict';
import { getOvertimeRequest } from '../../lib/get-overtime-request';

export default async function ProductionOvertimePage(props: {
  params: Promise<{ lang: Locale; id: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await props.params;
  const { lang, id } = params;
  const dict = await getDictionary(lang);

  let overtimeRequestLocaleString;
  ({ overtimeRequestLocaleString } = await getOvertimeRequest(lang, id));

  return (
    <Card>
      <CardHeader>
        <div className='space-y-2 sm:flex sm:justify-between sm:gap-4'>
          <CardTitle>{dict.idTable.title}</CardTitle>
          <Button variant='outline' asChild>
            <LocalizedLink href='/production-overtime'>
              <Table /> <span>{dict.idTable.requestsTable}</span>
            </LocalizedLink>
          </Button>
        </div>

        {/* <CardDescription>ID: {id}</CardDescription> */}
      </CardHeader>

      <DataTableWrapper
        data={(
          overtimeRequestLocaleString.employeesWithScheduledDayOff || []
        ).map((employee) => ({
          ...employee,
          overtimeId: overtimeRequestLocaleString._id,
        }))}
        id={id}
        status={overtimeRequestLocaleString.status}
        dict={dict}
      />
    </Card>
  );
}
