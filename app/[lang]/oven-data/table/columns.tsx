'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { OvenProcessDataType } from '../lib/types';
import type { Dictionary } from '../lib/dict';

export const getOvenColumns = (dict: Dictionary): ColumnDef<OvenProcessDataType>[] => [
  {
    accessorKey: 'oven',
    header: ({ column }) => (
      <Button
        variant='ghost'
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        {dict.processColumns.oven}
        <ArrowUpDown />
      </Button>
    ),
    cell: ({ row }) => <div>{String(row.getValue('oven')).toUpperCase()}</div>,
  },
  {
    accessorKey: 'status',
    header: dict.processColumns.status,
    cell: ({ row }) => {
      const status = row.getValue('status') as string;

      const getStatusLabel = (status: string) => {
        switch (status) {
          case 'running':
            return dict.processStatus.running;
          case 'completed':
          case 'finished':
            return dict.processStatus.completed;
          case 'failed':
          case 'deleted':
            return dict.processStatus.failed;
          default:
            return status ? status.charAt(0).toUpperCase() + status.slice(1) : '';
        }
      };

      const getStatusStyles = (status: string) => {
        switch (status) {
          case 'prepared':
            return {
              variant: 'outline' as const,
              className: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
            };
          case 'running':
            return {
              variant: 'default' as const,
              className: 'bg-green-100 text-green-800 hover:bg-green-200',
            };
          case 'deleted':
          case 'failed':
            return {
              variant: 'destructive' as const,
              className: 'bg-red-100 text-red-800 hover:bg-red-200',
            };
          default: // finished/completed
            return {
              variant: 'secondary' as const,
              className: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
            };
        }
      };

      const styles = getStatusStyles(status);

      return (
        <Badge variant={styles.variant} className={`${styles.className} whitespace-nowrap`}>
          {getStatusLabel(status)}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'article',
    header: dict.processColumns.article,
    cell: ({ row }) => <div>{row.getValue('article')}</div>,
  },
  {
    accessorKey: 'hydraBatch',
    header: dict.processColumns.hydraBatch,
    cell: ({ row }) => <div>{row.getValue('hydraBatch')}</div>,
  },
  {
    accessorKey: 'startOperators',
    header: dict.processColumns.startOperators,
    cell: ({ row }) => {
      // Render start operators as a comma-separated string
      const operators = row.getValue('startOperators') as string[];
      return (
        <div>
          {Array.isArray(operators) ? operators.join(', ') : operators || '-'}
        </div>
      );
    },
  },
  {
    accessorKey: 'endOperators',
    header: dict.processColumns.endOperators,
    cell: ({ row }) => {
      // Render end operators as a comma-separated string
      const operators = row.getValue('endOperators') as string[];
      return <div>{Array.isArray(operators) ? operators.join(', ') : '-'}</div>;
    },
  },
  {
    accessorKey: 'startTimeLocaleString',
    header: ({ column }) => (
      <Button
        variant='ghost'
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        {dict.processColumns.startTime}
        <ArrowUpDown />
      </Button>
    ),
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      const startTime = row.getValue('startTimeLocaleString') as string;
      
      if (status === 'prepared') {
        return <div>-</div>;
      }
      
      return <div>{startTime}</div>;
    },
  },
  {
    accessorKey: 'endTimeLocaleString',
    header: ({ column }) => (
      <Button
        variant='ghost'
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        {dict.processColumns.endTime}
        <ArrowUpDown />
      </Button>
    ),
    cell: ({ row }) => {
      const endTime = row.getValue('endTimeLocaleString') as string;
      const status = row.getValue('status') as string;

      if (endTime) {
        return <div>{endTime}</div>;
      }

      if (status === 'deleted') {
        return <span className='text-gray-400'>-</span>;
      }

      return <span className='text-gray-400'>-</span>;
    },
  },
  {
    accessorKey: 'duration',
    header: dict.processColumns.duration,
    cell: ({ row }) => {
      const duration = row.getValue('duration') as number;
      if (!duration) {
        return <span className='text-gray-400'>-</span>;
      }
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      return (
        <div>
          {hours}h {minutes}m
        </div>
      );
    },
  },
  {
    accessorKey: 'targetTemp',
    header: dict.processColumns.targetTemp,
    cell: ({ row }) => {
      const targetTemp = row.original.targetTemp;
      const tempTolerance = row.original.tempTolerance;
      if (!targetTemp || !tempTolerance) {
        return <span className='text-gray-400'>-</span>;
      }
      return (
        <div>
          <div>{targetTemp}°C</div>
          <div className='text-xs text-gray-500'>±{tempTolerance}°C</div>
        </div>
      );
    },
  },
];
