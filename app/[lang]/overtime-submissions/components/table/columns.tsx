'use client';

import LocalizedLink from '@/components/localized-link';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatTime } from '@/lib/utils/date-format';
import { extractNameFromEmail } from '@/lib/utils/name-format';
import { ColumnDef } from '@tanstack/react-table';
import { Session } from 'next-auth';
import { Dictionary } from '../../lib/dict';
import { OvertimeSubmissionType } from '../../lib/types';

// Creating a columns factory function that takes the session and dict
export const createColumns = (
  session: Session | null,
  dict: Dictionary,
): ColumnDef<OvertimeSubmissionType>[] => {
  return [
    {
      accessorKey: 'internalId',
      header: 'ID',
      cell: ({ row }) => {
        const internalId = row.getValue('internalId') as string;
        const submission = row.original;
        return (
          <LocalizedLink
            href={`/overtime-submissions/${submission._id}`}
            className='text-blue-600 hover:underline dark:text-blue-400'
          >
            {internalId || '-'}
          </LocalizedLink>
        );
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
    // Settlement type column (Zlecenie odbiór)
    {
      accessorKey: 'payment',
      header: dict.columns.payment,
      cell: ({ row }) => {
        const overtimeRequest = row.original.overtimeRequest;
        const payment = row.original.payment as boolean;
        const scheduledDayOff = row.original.scheduledDayOff;

        // Only show content for overtime requests
        if (!overtimeRequest) {
          return <div className='text-sm'></div>;
        }

        let displayText = dict.columns.payoutNoPickup;
        if (!payment && scheduledDayOff) {
          displayText = formatDate(scheduledDayOff);
        }

        return <div className='text-sm'>{displayText}</div>;
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
      accessorKey: 'date',
      header: dict.columns.date,
      cell: ({ row }) => {
        const submission = row.original;
        // For overtime orders, show time range instead of date
        if (
          submission.overtimeRequest &&
          submission.workStartTime &&
          submission.workEndTime
        ) {
          const startTime = new Date(submission.workStartTime);
          const endTime = new Date(submission.workEndTime);

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
        // For regular submissions, show date as before
        const date = row.getValue('date') as string;
        return <span>{formatDate(date)}</span>;
      },
    },
    {
      accessorKey: 'hours',
      header: dict.columns.hours,
      cell: ({ row }) => {
        const hours = row.getValue('hours') as number;
        return (
          <span className={hours < 0 ? 'text-red-600 dark:text-red-400' : ''}>
            {hours}h
          </span>
        );
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
