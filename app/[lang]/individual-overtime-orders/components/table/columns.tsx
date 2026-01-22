'use client';

import LocalizedLink from '@/components/localized-link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate, formatTime } from '@/lib/utils/date-format';
import { extractNameFromEmail } from '@/lib/utils/name-format';
import { ColumnDef } from '@tanstack/react-table';
import { Banknote, CalendarCheck, Eye, MoreHorizontal, X } from 'lucide-react';
import { Session } from 'next-auth';
import { Dictionary } from '../../lib/dict';
import { IndividualOvertimeOrderType } from '../../lib/types';

// Creating a columns factory function that takes the session and dict
export const createColumns = (
  session: Session | null,
  dict: Dictionary,
): ColumnDef<IndividualOvertimeOrderType>[] => {
  return [
    {
      accessorKey: 'internalId',
      header: 'ID',
      cell: ({ row }) => {
        const internalId = row.getValue('internalId') as string;
        return <span>{internalId || '-'}</span>;
      },
    },
    {
      accessorKey: 'status',
      header: dict.columns.status,
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        let statusLabel;

        switch (status) {
          case 'pending':
            statusLabel = (
              <Badge variant='statusPending' className='text-nowrap'>
                {dict.status.pending}
              </Badge>
            );
            break;
          case 'pending-plant-manager':
            statusLabel = (
              <Badge
                variant='statusPending'
                className='bg-yellow-400 text-nowrap text-black'
              >
                {dict.status.pendingPlantManager}
              </Badge>
            );
            break;
          case 'approved':
            statusLabel = (
              <Badge variant='statusApproved'>{dict.status.approved}</Badge>
            );
            break;
          case 'rejected':
            statusLabel = (
              <Badge variant='statusRejected'>{dict.status.rejected}</Badge>
            );
            break;
          case 'accounted':
            statusLabel = (
              <Badge variant='statusAccounted'>{dict.status.accounted}</Badge>
            );
            break;
          case 'cancelled':
            statusLabel = (
              <Badge variant='statusCancelled'>{dict.status.cancelled}</Badge>
            );
            break;
          default:
            statusLabel = <Badge variant='outline'>{status}</Badge>;
        }

        return statusLabel;
      },
    },
    {
      id: 'actions',
      header: dict.columns?.actions || 'Actions',
      cell: ({ row, table }) => {
        const order = row.original;
        const status = order.status;
        const canCancel =
          status === 'pending' || status === 'pending-plant-manager';
        const meta = table.options.meta as any;
        const onCancelClick = meta?.onCancelClick;
        const returnUrl = meta?.returnUrl;

        // Build detail URL with returnUrl param if available
        const detailUrl = returnUrl
          ? `/individual-overtime-orders/${order._id}?returnUrl=${encodeURIComponent(returnUrl)}`
          : `/individual-overtime-orders/${order._id}`;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' className='h-8 w-8 p-0'>
                <span className='sr-only'>Open menu</span>
                <MoreHorizontal className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='start'>
              <LocalizedLink href={detailUrl}>
                <DropdownMenuItem>
                  <Eye />
                  {dict.actions?.viewDetails || 'View details'}
                </DropdownMenuItem>
              </LocalizedLink>
              {canCancel && onCancelClick && (
                <DropdownMenuItem
                  onClick={() => onCancelClick(order._id)}
                  className='text-destructive focus:text-destructive'
                >
                  <X />
                  {dict.actions?.cancelSubmission || 'Cancel'}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
    // Type column - shows entry type with colored badges and icons
    {
      id: 'type',
      header: dict.columns.type,
      cell: ({ row }) => {
        const { payment, scheduledDayOff } = row.original;
        if (payment) {
          return (
            <Badge variant='typePayout' className='gap-1.5'>
              <Banknote className='h-3 w-3' />
              {dict.columns.typePayout}
            </Badge>
          );
        }
        if (scheduledDayOff) {
          return (
            <Badge variant='typeDayOff' className='gap-1.5'>
              <CalendarCheck className='h-3 w-3' />
              {dict.columns.typeDayOff}: {formatDate(scheduledDayOff)}
            </Badge>
          );
        }
        return null;
      },
    },
    {
      accessorKey: 'supervisor',
      header: dict.columns.supervisor,
      cell: ({ row }) => {
        const email = row.getValue('supervisor') as string;
        return (
          <span className='whitespace-nowrap'>
            {extractNameFromEmail(email)}
          </span>
        );
      },
    },
    {
      id: 'workTime',
      header: dict.columns.date,
      cell: ({ row }) => {
        const order = row.original;
        if (order.workStartTime && order.workEndTime) {
          const startTime = new Date(order.workStartTime);
          const endTime = new Date(order.workEndTime);

          // Check if same day
          const sameDay = startTime.toDateString() === endTime.toDateString();

          if (sameDay) {
            // Same day: dd/MM/yyyy HH:mm - HH:mm
            return (
              <span className='whitespace-nowrap'>
                {formatDate(startTime)}{' '}
                {formatTime(startTime, { hour: '2-digit', minute: '2-digit' })}{' '}
                - {formatTime(endTime, { hour: '2-digit', minute: '2-digit' })}
              </span>
            );
          } else {
            // Different days: dd/MM/yyyy HH:mm - dd/MM/yyyy HH:mm
            return (
              <span className='whitespace-nowrap'>
                {formatDate(startTime)}{' '}
                {formatTime(startTime, { hour: '2-digit', minute: '2-digit' })}{' '}
                - {formatDate(endTime)}{' '}
                {formatTime(endTime, { hour: '2-digit', minute: '2-digit' })}
              </span>
            );
          }
        }
        return <span>-</span>;
      },
    },
    {
      accessorKey: 'hours',
      header: dict.columns.hours,
      cell: ({ row }) => {
        const hours = row.getValue('hours') as number;
        return <span>{hours}h</span>;
      },
    },
    {
      accessorKey: 'reason',
      header: dict.columns.reason,
      cell: ({ row }) => {
        const reason = row.getValue('reason') as string | undefined;
        if (!reason) return <div className='max-w-[200px]'>-</div>;
        const truncated =
          reason.length > 80 ? `${reason.substring(0, 80)}...` : reason;
        return <div className='max-w-[200px]'>{truncated}</div>;
      },
    },
  ];
};
