'use client';

import { CardTableDataType, WarehouseConfigType } from '../lib/types';
import { Button } from '@/components/ui/button';
import { ColumnDef } from '@tanstack/react-table';
import { List } from 'lucide-react';
import LocalizedLink from '@/components/localized-link';
import { Dictionary } from '../lib/dict';

export function createCardsColumns(
  dict: Dictionary,
  warehouseOptions: WarehouseConfigType[],
): ColumnDef<CardTableDataType>[] {
  return [
    {
      accessorKey: 'sector',
      header: dict.cards.sector,
      filterFn: (row, columnId, value: string) => {
        if (!value) return true;
        const selectedValues = value.split(',');
        const rowValue = row.getValue(columnId) as string;
        return selectedValues.includes(rowValue);
      },
    },
    {
      accessorKey: 'number',
      header: dict.cards.number,
      filterFn: 'includesString',
    },
    {
      id: 'actions',
      header: dict.cards.positions,
      cell: ({ row }) => {
        const cardNumber = row.original.number;
        return (
          <LocalizedLink href={`/inventory/${cardNumber}`}>
            <Button size='sm' type='button' variant='outline'>
              <List />
            </Button>
          </LocalizedLink>
        );
      },
    },
    {
      accessorKey: 'creators',
      header: dict.cards.creators,
      filterFn: 'includesString',

      cell: ({ row }) => {
        const creators = row.original.creators;
        return <span className='text-nowrap'>{creators.join(', ')}</span>;
      },
    },
    {
      accessorKey: 'positionsLength',
      header: dict.cards.positionsCount,
    },
    {
      accessorKey: 'approvedPositions',
      header: dict.cards.approvedCount,
      cell: ({ row }) => {
        const approvedPositions = row.original.approvedPositions;
        const totalPositions = row.original.positionsLength;
        const shouldHighlight =
          totalPositions <= 3 ? approvedPositions === 0 : approvedPositions < 3;

        return (
          <div
            className={`text-center ${shouldHighlight ? 'animate-pulse font-bold text-red-500' : ''}`}
          >
            {approvedPositions}
          </div>
        );
      },
    },
    {
      accessorKey: 'warehouse',
      header: dict.cards.warehouse,
      cell: ({ row }) => {
        const warehouseValue = row.original.warehouse;
        const warehouseLabel =
          warehouseOptions?.find((w) => w.value === warehouseValue)?.label ||
          warehouseValue;
        return <div className='text-nowrap'>{warehouseLabel}</div>;
      },
      filterFn: (row, columnId, value: string) => {
        if (!value) return true;
        const selectedValues = value.split(',');
        const rowValue = row.getValue(columnId) as string;
        return selectedValues.includes(rowValue);
      },
    },
  ];
}
