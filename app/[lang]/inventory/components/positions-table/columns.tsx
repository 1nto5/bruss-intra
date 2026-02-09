'use client';

import { PositionType, WarehouseConfigType } from '../../lib/types';
import { Button } from '@/components/ui/button';
import { ColumnDef } from '@tanstack/react-table';
import { Check, Pencil } from 'lucide-react';
import { Dictionary } from '../../lib/dict';
import LocalizedLink from '@/components/localized-link';

export const createColumns = (
  dict: Dictionary,
  warehouseOptions: WarehouseConfigType[],
): ColumnDef<PositionType>[] => [
  {
    accessorKey: 'identifier',
    header: 'Id',
  },
  {
    accessorKey: 'warehouse',
    header: dict.positions.warehouse,
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
      return selectedValues.includes(row.getValue(columnId) as string);
    },
  },
  {
    accessorKey: 'sector',
    header: dict.positions.sector,
    filterFn: (row, columnId, value: string) => {
      if (!value) return true;
      const selectedValues = value.split(',');
      return selectedValues.includes(row.getValue(columnId) as string);
    },
  },
  {
    id: 'actions',
    header: dict.positions.edit,
    cell: ({ row }) => {
      const identifier = row.original.identifier;
      const [cardNumber, position] = identifier.split('/');
      return (
        <LocalizedLink href={`/inventory/${cardNumber}/${position}/edit`}>
          <Button size='sm' variant='outline'>
            <Pencil />
          </Button>
        </LocalizedLink>
      );
    },
  },
  {
    accessorKey: 'articleName',
    header: dict.positions.articleName,
    cell: ({ row }) => {
      const articleName = row.original.articleName;
      return <div className='text-nowrap'>{articleName}</div>;
    },
  },
  {
    accessorKey: 'articleNumber',
    header: dict.positions.articleNumber,
  },
  {
    accessorKey: 'quantity',
    header: dict.positions.quantity,
    cell: ({ row }) => {
      const quantity = row.original.quantity;
      const unit = row.original.unit;
      return (
        <div className='text-nowrap'>
          {quantity} {unit}
        </div>
      );
    },
    filterFn: (row, columnId, value) => {
      return row.getValue(columnId) === Number(value);
    },
  },
  {
    accessorKey: 'wip',
    header: dict.positions.wip,
    cell: ({ row }) => {
      const wip = row.original.wip;
      return wip ? <Check /> : null;
    },
  },
  {
    accessorKey: 'approver',
    header: dict.positions.approver,
  },
  {
    accessorKey: 'approvedAtLocaleString',
    header: dict.positions.approvedAt,
  },
  {
    accessorKey: 'comment',
    header: dict.positions.comment,
    cell: ({ row }) => {
      const comment = row.getValue('comment');
      return <div className='w-[300px]'>{comment as React.ReactNode}</div>;
    },
  },
  {
    accessorKey: 'bin',
    header: dict.positions.bin,
    cell: ({ row }) => {
      const bin = row.original.bin;
      return <div className='text-nowrap'>{bin && bin.toUpperCase()}</div>;
    },
    filterFn: (row, columnId, value: string) => {
      if (!value) return true;
      const selectedValues = value.split(',');
      return selectedValues.includes(row.getValue(columnId) as string);
    },
  },
  {
    accessorKey: 'deliveryDateLocaleString',
    header: dict.positions.deliveryDate,
  },
];
