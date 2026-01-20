import { ColumnDef } from '@tanstack/react-table';

import { DeviationType } from '@/app/[lang]/deviations/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { extractNameFromEmail } from '@/lib/utils/name-format';
import { formatDateTime } from '@/lib/utils/date-format';
import { ExternalLink, Pencil } from 'lucide-react';
import LocalizedLink from '@/components/localized-link';
import type { Dictionary } from '../../lib/dict';

export function getColumns(dict: Dictionary): ColumnDef<DeviationType>[] {
  return [
  {
    accessorKey: 'internalId',
    header: dict.table.columns.id,
    cell: ({ row }) => {
      const id = row.original.internalId?.toString();

      return id ? id : '-';
    },
  },
  {
    accessorKey: 'status',
    header: dict.table.columns.status,
    cell: ({ row }) => {
      const status = row.original.status;
      let statusLabel;

      switch (status) {
        case 'in approval':
          statusLabel = (
            <Badge variant='statusPending' className='text-nowrap'>
              {dict.table.status.inApproval}
            </Badge>
          );
          break;
        case 'approved':
          statusLabel = <Badge variant='statusApproved'>{dict.table.status.approved}</Badge>;
          break;
        case 'in progress':
          statusLabel = <Badge variant='statusInProgress'>{dict.table.status.inProgress}</Badge>;
          break;
        case 'closed':
          statusLabel = <Badge variant='statusClosed'>{dict.table.status.closed}</Badge>;
          break;
        case 'rejected':
          statusLabel = <Badge variant='statusRejected'>{dict.table.status.rejected}</Badge>;
          break;
        case 'to approve':
          statusLabel = (
            <Badge variant='statusToApprove' className='text-nowrap'>
              {dict.table.status.toApprove}
            </Badge>
          );
          break;
        case 'draft':
          statusLabel = <Badge variant='statusDraft'>{dict.table.status.draft}</Badge>;
          break;
        case 'cancelled':
          statusLabel = <Badge variant='statusCancelled'>{dict.table.status.cancelled}</Badge>;
          break;
        default:
          statusLabel = <Badge variant='outline'>{status}</Badge>;
      }

      return statusLabel;
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row, table }) => {
      const deviation = row.original;
      const lang = table.options.meta?.lang as string;

      return (
        <Button variant='outline' size={'icon'} asChild>
          <LocalizedLink
            href={
              deviation.status === 'draft'
                ? `/deviations/edit/${deviation._id}`
                : `/deviations/${deviation._id}`
            }
          >
            {deviation.status === 'draft' ? <Pencil /> : <ExternalLink />}
            <span className='sr-only'>
              {deviation.status === 'draft' ? dict.table.actions.edit : dict.table.actions.open}
            </span>
          </LocalizedLink>
        </Button>
      );
    },
  },
  {
    accessorKey: 'timePeriodLocalDateString.from',
    header: dict.table.columns.from,
  },
  {
    accessorKey: 'timePeriodLocalDateString.to',
    header: dict.table.columns.to,
  },
  {
    accessorKey: 'articleNumber',
    header: dict.table.columns.article,
    cell: ({ row }) => {
      const articleNumber = row.original.articleNumber;
      const articleName = row.original.articleName;
      return (
        <span className='whitespace-nowrap'>
          {articleNumber} - {articleName}
        </span>
      );
    },
  },
  {
    accessorKey: 'quantity.value',
    header: dict.table.columns.quantity,
    cell: ({ row }) => {
      const quantity = row.original.quantity;
      const value = quantity?.value;
      const unit = quantity?.unit;

      return (
        <span className='text-nowrap'>
          {value} {unit && ` ${unit === 'pcs' ? dict.table.units.pcs : unit}`}
        </span>
      );
    },
  },
  {
    accessorKey: 'area',
    header: dict.table.columns.area,
    cell: ({ row, table }) => {
      const area = row.original.area;
      const lang = table.options.meta?.lang as string;
      const areaOptions = table.options.meta?.areaOptions || [];

      if (area) {
        const areaOption = areaOptions.find((option) => option.value === area);
        if (areaOption) {
          return lang === 'pl' ? areaOption.pl : areaOption.label;
        }
        return area;
      }

      return '-';
    },
  },
  {
    accessorKey: 'reason',
    header: dict.table.columns.reason,
    cell: ({ row, table }) => {
      const reason = row.original.reason;
      const lang = table.options.meta?.lang as string;
      const reasonOptions = table.options.meta?.reasonOptions || [];

      if (reason) {
        const reasonOption = reasonOptions.find(
          (option) => option.value === reason,
        );
        if (reasonOption) {
          return (
            <div className='w-[250px] text-justify'>
              {lang === 'pl' ? reasonOption.pl : reasonOption.label}
            </div>
          );
        }
        return <div className='w-[250px] text-justify'>{reason}</div>;
      }

      return '-';
    },
  },
  {
    accessorKey: 'owner',
    header: dict.table.columns.owner,
    cell: ({ row }) => {
      const owner = row.original.owner;
      const name = extractNameFromEmail(owner);
      return <span className='whitespace-nowrap'>{name}</span>;
    },
  },
  {
    accessorKey: 'createdAt',
    header: dict.table.columns.createdAt,
    cell: ({ row, table }) => {
      const createdAt = row.original.createdAt;
      const lang = table.options.meta?.lang as string;
      return (
        <span className='whitespace-nowrap'>
          {createdAt ? formatDateTime(createdAt) : ''}
        </span>
      );
    },
  },
];
}
