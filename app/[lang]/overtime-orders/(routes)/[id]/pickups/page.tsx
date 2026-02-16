import { auth } from '@/lib/auth';
import LocalizedLink from '@/components/localized-link';
import NoAccess from '@/components/no-access';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Locale } from '@/lib/config/i18n';
import { getDictionary as getGlobalDictionary } from '@/lib/dict';
import { AlarmClockPlus, ArrowLeft } from 'lucide-react';
import { redirect } from 'next/navigation';
import { DataTable } from '../../../components/id-table/data-table';
import { getDictionary } from '../../../lib/dict';
import { getOvertimeRequest } from '../../../lib/get-overtime-request';
import { hasOvertimeViewAccess } from '../../../lib/overtime-roles';

export default async function ProductionOvertimePage(props: {
  params: Promise<{ lang: Locale; id: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await props.params;
  const { lang, id } = params;

  const session = await auth();
  if (!session) {
    redirect(`/${lang}/auth?callbackUrl=/${lang}/overtime-orders/${id}/pickups`);
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

  const dict = await getDictionary(lang);

  const { overtimeRequestLocaleString: request } = await getOvertimeRequest(lang, id);

  const shouldShowAddButton =
    request.status &&
    request.status !== 'completed' &&
    request.status !== 'canceled' &&
    request.status !== 'accounted';

  return (
    <Card>
      <CardHeader className='pb-2'>
        <div className='mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <CardTitle>{dict.idTable.title}</CardTitle>
            <CardDescription>
              ID zlecenia: {request.internalId}
            </CardDescription>
          </div>
          <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
            <LocalizedLink
              href={`/overtime-orders/${id}`}
              className='w-full sm:w-auto'
            >
              <Button variant='outline' className='w-full'>
                <ArrowLeft /> <span>{dict.addDayOffForm.backToRequest}</span>
              </Button>
            </LocalizedLink>
            {shouldShowAddButton && (
              <LocalizedLink
                href={`/overtime-orders/${id}/add-day-off`}
                className='w-full sm:w-auto'
              >
                <Button variant='outline' className='w-full'>
                  <AlarmClockPlus /> <span>{dict.idTable.addPickup}</span>
                </Button>
              </LocalizedLink>
            )}
            <LocalizedLink
              href={`/overtime-orders`}
              className='w-full sm:w-auto'
            >
              <Button variant='outline' className='w-full'>
                <ArrowLeft /> <span>{dict.detailsPage.backToOrders}</span>
              </Button>
            </LocalizedLink>
          </div>
        </div>
      </CardHeader>

      <DataTable
        data={(
          request.employeesWithScheduledDayOff || []
        ).map((employee) => ({
          ...employee,
          overtimeId: request._id,
        }))}
        id={id}
        status={request.status}
        dict={dict}
      />
    </Card>
  );
}
