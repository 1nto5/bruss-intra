'use client';

import { PositionType } from '../../lib/types';
import { Button } from '@/components/ui/button';
import { ColumnDef } from '@tanstack/react-table';
import { Check, Pencil } from 'lucide-react';
import { Dictionary } from '../../lib/dict';
import LocalizedLink from '@/components/localized-link';

export const createColumns = (dict: Dictionary): ColumnDef<PositionType>[] => [
  {
    accessorKey: 'identifier',
    header: 'Id',
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
    filterFn: (row, id, value) => {
      if (!value) return true;
      const cellValue = String(row.getValue(id));
      return value.split(',').some((v: string) =>
        cellValue.toLowerCase().includes(v.toLowerCase())
      );
    },
  },
  {
    accessorKey: 'deliveryDateLocaleString',
    header: dict.positions.deliveryDate,
  },
];
