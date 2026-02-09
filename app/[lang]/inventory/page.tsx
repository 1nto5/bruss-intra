import { CardTableDataType } from './lib/types';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Locale } from '@/lib/config/i18n';
import { formatDateTime } from '@/lib/utils/date-format';
import { getDictionary } from './lib/dict';
import { DataTable } from './components/table/data-table';
import { getInventoryFilterOptions } from '@/lib/data/get-inventory-filter-options';
import ExportButton from './components/export-button';
import LocalizedLink from '@/components/localized-link';
import { List } from 'lucide-react';

async function getCards(): Promise<{
  cardsFetchTime: string;
  fetchTime: Date;
  cards: CardTableDataType[];
}> {
  const res = await fetch(`${process.env.API}/inventory/cards`, {
    next: { revalidate: 0, tags: ['inventory-cards'] },
  });

  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `getCards error:  ${res.status}  ${res.statusText} ${json.error}`,
    );
  }

  const fetchTime = new Date(res.headers.get('date') || '');
  const cardsFetchTime = formatDateTime(fetchTime);

  let cards: CardTableDataType[] = await res.json();

  cards = cards.map((card) => ({
    ...card,
    positionsLength: card.positions ? card.positions.length : 0,
    approvedPositions: card.positions
      ? card.positions.filter((p) => p.approver).length
      : 0,
  }));

  cards = cards.filter((card) => card.positions && card.positions.length > 0);
  return { cardsFetchTime, fetchTime, cards };
}

export default async function InventoryPage(props: {
  params: Promise<{ lang: Locale }>;
}) {
  const params = await props.params;
  const { lang } = params;

  const [dict, { cardsFetchTime, cards }, { warehouseOptions, sectorConfigsMap }] =
    await Promise.all([getDictionary(lang), getCards(), getInventoryFilterOptions()]);

  return (
    <Card>
      <CardHeader className='pb-2'>
        <div className='mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <CardTitle>{dict.page.title}</CardTitle>
          </div>
          <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
            <LocalizedLink href='/inventory/positions'>
              <Button variant='outline' className='w-full sm:w-auto'>
                <List /> {dict.page.allPositions}
              </Button>
            </LocalizedLink>
            <ExportButton />
          </div>
        </div>
      </CardHeader>
      <DataTable
        data={cards}
        fetchTime={cardsFetchTime}
        lang={lang}
        dict={dict}
        warehouseOptions={warehouseOptions}
        sectorConfigsMap={sectorConfigsMap}
      />
    </Card>
  );
}
