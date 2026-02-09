import { CardPositionsTableDataType } from '../../lib/types';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Locale } from '@/lib/config/i18n';
import { extractNameFromEmail } from '@/lib/utils/name-format';
import { formatDate, formatDateTime } from '@/lib/utils/date-format';
import { getDictionary } from '../../lib/dict';
import { DataTable } from '../../components/positions-table/data-table';
import ExportButton from '../../components/export-button';
import LocalizedLink from '@/components/localized-link';
import { ArrowLeft } from 'lucide-react';
import { getInventoryFilterOptions } from '@/lib/data/get-inventory-filter-options';

async function getAllPositions(): Promise<{
  fetchTime: string;
  positions: CardPositionsTableDataType[];
}> {
  const res = await fetch(`${process.env.API}/inventory/positions`, {
    next: { revalidate: 0, tags: ['inventory-positions'] },
  });

  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `getAllPositions error:  ${res.status}  ${res.statusText} ${json.error}`,
    );
  }

  const dateFromResponse = new Date(res.headers.get('date') || '');
  const fetchTime = formatDateTime(dateFromResponse);

  const data = await res.json();
  let positions: CardPositionsTableDataType[] = data.positions || [];

  positions = positions.map((position) => ({
    ...position,
    approver: position.approver ? extractNameFromEmail(position.approver) : '',
    approvedAtLocaleString:
      position.approvedAt && formatDateTime(position.approvedAt),
    deliveryDateLocaleString:
      position.deliveryDate && formatDate(position.deliveryDate),
  }));

  return { fetchTime, positions };
}

export default async function AllPositionsPage(props: {
  params: Promise<{ lang: Locale }>;
}) {
  const params = await props.params;
  const { lang } = params;
  const dict = await getDictionary(lang);

  const [{ fetchTime, positions }, { warehouseOptions, sectorConfigsMap, binOptions }] =
    await Promise.all([getAllPositions(), getInventoryFilterOptions()]);

  return (
    <Card>
      <CardHeader className='pb-2'>
        <div className='mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <CardTitle>{dict.positions.title}</CardTitle>
          </div>
          <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
            <ExportButton />
            <LocalizedLink href='/inventory'>
              <Button variant='outline' className='w-full sm:w-auto'>
                <ArrowLeft /> {dict.page.backToCards}
              </Button>
            </LocalizedLink>
          </div>
        </div>
      </CardHeader>
      <DataTable
        data={positions}
        fetchTime={fetchTime}
        lang={lang}
        dict={dict}
        warehouseOptions={warehouseOptions}
        sectorConfigsMap={sectorConfigsMap}
        binOptions={binOptions}
      />
    </Card>
  );
}
