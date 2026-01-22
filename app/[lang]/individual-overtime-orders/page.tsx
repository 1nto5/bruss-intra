import LocalizedLink from '@/components/localized-link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { Locale } from '@/lib/config/i18n';
import { dbc } from '@/lib/db/mongo';
import { formatDateTime } from '@/lib/utils/date-format';
import { Plus } from 'lucide-react';
import { Session } from 'next-auth';
import { redirect } from 'next/navigation';
import TableFilteringAndOptions from './components/table-filtering-and-options';
import { createColumns } from './components/table/columns';
import { DataTable } from './components/table/data-table';
import { getDictionary } from './lib/dict';
import { IndividualOvertimeOrderType, OrderStatus } from './lib/types';

export const dynamic = 'force-dynamic';

async function getOrders(
  session: Session,
  searchParams: { [key: string]: string | undefined },
): Promise<{
  fetchTime: Date;
  fetchTimeLocaleString: string;
  orders: IndividualOvertimeOrderType[];
}> {
  if (!session || !session.user?.email) {
    redirect('/auth?callbackUrl=/individual-overtime-orders');
  }

  const coll = await dbc('individual_overtime_orders');

  // Build query
  const query: any = {
    submittedBy: session.user.email,
  };

  // Status filter
  if (searchParams.status) {
    const statuses = searchParams.status.split(',') as OrderStatus[];
    query.status = { $in: statuses };
  }

  // Year filter
  if (searchParams.year) {
    const years = searchParams.year.split(',').map((y) => parseInt(y));
    const yearConditions = years.map((year) => ({
      workStartTime: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1),
      },
    }));
    query.$or = yearConditions;
  }

  // Month filter
  if (searchParams.month) {
    const months = searchParams.month.split(',');
    const monthConditions = months.map((m) => {
      const [year, month] = m.split('-').map((v) => parseInt(v));
      return {
        workStartTime: {
          $gte: new Date(year, month - 1, 1),
          $lt: new Date(year, month, 1),
        },
      };
    });
    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: monthConditions }];
      delete query.$or;
    } else {
      query.$or = monthConditions;
    }
  }

  // Week filter (ISO week)
  if (searchParams.week) {
    const weeks = searchParams.week.split(',');
    const weekConditions = weeks.map((w) => {
      const [yearStr, weekPart] = w.split('-W');
      const year = parseInt(yearStr);
      const week = parseInt(weekPart);

      // Calculate ISO week start (Monday)
      const simple = new Date(year, 0, 1 + (week - 1) * 7);
      const dayOfWeek = simple.getDay();
      const monday = new Date(simple);
      if (dayOfWeek <= 4) {
        monday.setDate(simple.getDate() - simple.getDay() + 1);
      } else {
        monday.setDate(simple.getDate() + 8 - simple.getDay());
      }

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 7);

      return {
        workStartTime: {
          $gte: monday,
          $lt: sunday,
        },
      };
    });

    if (query.$and) {
      query.$and.push({ $or: weekConditions });
    } else if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: weekConditions }];
      delete query.$or;
    } else {
      query.$or = weekConditions;
    }
  }

  // ID filter
  if (searchParams.id) {
    query.internalId = { $regex: searchParams.id, $options: 'i' };
  }

  const orders = await coll
    .find(query)
    .sort({ submittedAt: -1 })
    .toArray();

  const fetchTime = new Date();
  const fetchTimeLocaleString = formatDateTime(fetchTime);

  return {
    fetchTime,
    fetchTimeLocaleString,
    orders: orders.map((o) => ({
      ...o,
      _id: o._id.toString(),
    })) as IndividualOvertimeOrderType[],
  };
}

export default async function IndividualOvertimeOrdersPage(props: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await props.params;
  const { lang } = params;
  const dict = await getDictionary(lang);
  const searchParams = await props.searchParams;
  const session = await auth();

  if (!session || !session.user?.email) {
    redirect(`/${lang}/auth?callbackUrl=/individual-overtime-orders`);
  }

  const { fetchTime, orders } = await getOrders(session, searchParams);

  // Build returnUrl for preserving filters when navigating to detail pages
  const searchParamsString = new URLSearchParams(
    Object.entries(searchParams).filter(([, v]) => v !== undefined) as [
      string,
      string,
    ][],
  ).toString();
  const returnUrl = searchParamsString
    ? `/individual-overtime-orders?${searchParamsString}`
    : '/individual-overtime-orders';

  return (
    <Card>
      <CardHeader className='pb-2'>
        <div className='mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex items-center gap-3'>
            <CardTitle>{dict.pageTitle}</CardTitle>
          </div>
          <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
            <LocalizedLink href='/individual-overtime-orders/add'>
              <Button variant={'outline'} className='w-full sm:w-auto'>
                <Plus /> <span>{dict.addOrder}</span>
              </Button>
            </LocalizedLink>
          </div>
        </div>

        <TableFilteringAndOptions fetchTime={fetchTime} dict={dict} />
      </CardHeader>

      <DataTable
        columns={createColumns}
        data={orders}
        fetchTime={fetchTime}
        session={session}
        dict={dict}
        returnUrl={returnUrl}
      />
    </Card>
  );
}
