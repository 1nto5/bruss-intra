import { CardPositionsTableDataType } from '../../lib/types';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Locale } from '@/lib/config/i18n';
import { extractNameFromEmail } from '@/lib/utils/name-format';
import { formatDate, formatDateTime } from '@/lib/utils/date-format';
import { getDictionary } from '../../lib/dict';
import { DataTable } from './components/table/data-table';
import LocalizedLink from '@/components/localized-link';
import { ArrowLeft } from 'lucide-react';
import { getInventoryFilterOptions } from '@/lib/data/get-inventory-filter-options';

async function getCardPositions(
  cardNumber: string,
): Promise<{
  fetchTime: string;
  positions: CardPositionsTableDataType[];
  cardWarehouse: string;
  cardSector: string;
  cardCreators: string[];
}> {
  const res = await fetch(
    `${process.env.API}/inventory/card-positions?card-number=${cardNumber}`,
    {
      next: { revalidate: 0, tags: ['inventory-card-positions'] },
    },
  );

  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `getCardPositions error:  ${res.status}  ${res.statusText} ${json.error}`,
    );
  }

  const dateFromResponse = new Date(res.headers.get('date') || '');
  const fetchTime = formatDateTime(dateFromResponse);

  const resJson: {
    positions: CardPositionsTableDataType[];
    cardWarehouse: string;
    cardSector: string;
    cardCreators: string[];
  } = await res.json();
  let positions = resJson.positions;
  const cardWarehouse = resJson.cardWarehouse;
  const cardSector = resJson.cardSector;
  const cardCreators = resJson.cardCreators;
  positions = positions.map((position) => ({
    ...position,
    approver: position.approver ? extractNameFromEmail(position.approver) : '',
    approvedAtLocaleString:
      position.approvedAt && formatDateTime(position.approvedAt),
    deliveryDateLocaleString:
      position.deliveryDate && formatDate(position.deliveryDate),
  }));

  return {
    fetchTime,
    positions,
    cardWarehouse,
    cardSector,
    cardCreators,
  };
}

export default async function InventoryCardPage(props: {
  params: Promise<{ lang: Locale; cardNumber: string }>;
}) {
  const params = await props.params;
  const { cardNumber, lang } = params;

  const [dict, { fetchTime, positions, cardSector, cardWarehouse, cardCreators }, { warehouseOptions, sectorConfigsMap, binOptions }] =
    await Promise.all([
      getDictionary(lang),
      getCardPositions(cardNumber),
      getInventoryFilterOptions(),
    ]);

  return (
    <Card>
      <CardHeader className='pb-2'>
        <div className='mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <CardTitle>
              {dict.cards.positions}: {cardNumber}
            </CardTitle>
            <CardDescription className='font-bold'>
              {dict.cards.warehouse}: {cardWarehouse}, {dict.cards.sector}: {cardSector}, {dict.cards.creators}:{' '}
              {cardCreators.join(', ')}
            </CardDescription>
          </div>
          <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
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
        cardNumber={cardNumber}
        warehouseOptions={warehouseOptions}
        sectorConfigsMap={sectorConfigsMap}
        binOptions={binOptions}
      />
    </Card>
  );
}
