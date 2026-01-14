'use client';

import LocalizedLink from '@/components/localized-link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate, formatTime } from '@/lib/utils/date-format';
import { extractNameFromEmail } from '@/lib/utils/name-format';
import { ColumnDef } from '@tanstack/react-table';
import { CalendarCheck, Check, DollarSign, Edit2, FileText, MoreHorizontal, Trash2, X } from 'lucide-react';
import { Session } from 'next-auth';
import { useState } from 'react';
import { Dictionary } from '../../lib/dict';
import { OvertimeSubmissionType } from '../../lib/types';
import ApproveSubmissionDialog from '../approve-submission-dialog';
import ConvertToPayoutDialog from '../convert-to-payout-dialog';
import DeleteSubmissionDialog from '../delete-submission-dialog';
import MarkAsAccountedDialog from '../mark-as-accounted-dialog';
import RejectSubmissionDialog from '../reject-submission-dialog';
import SupervisorScheduleDayoffDialog from '../supervisor-schedule-dayoff-dialog';

// Creating a columns factory function that takes the session and dict
export const createColumns = (
  session: Session | null,
  dict: Dictionary,
): ColumnDef<OvertimeSubmissionType>[] => {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <div className='flex h-full items-center justify-center'>
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label='Select all'
          />
        </div>
      ),
      cell: ({ row, table }) => {
        // Determine if the row can be selected for any bulk action
        const session = (table.options.meta as any)?.session;
        const userRoles = session?.user?.roles || [];
        const isAdmin = userRoles.includes('admin');
        const isHR = userRoles.includes('hr');
        const userEmail = session?.user?.email;
        const submission = row.original;
        const canApprove =
          (submission.supervisor === userEmail || isHR || isAdmin) &&
          submission.status === 'pending';
        const canReject =
          (submission.supervisor === userEmail || isHR || isAdmin) &&
          submission.status === 'pending';
        const canMarkAsAccounted =
          (isHR || isAdmin) && submission.status === 'approved';
        const canCancel =
          submission.submittedBy === userEmail &&
          submission.status === 'pending';
        const canSelect =
          canApprove || canReject || canMarkAsAccounted || canCancel;
        return (
          <div className='flex h-full items-center justify-center'>
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label='Select row'
              disabled={!canSelect}
            />
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'internalId',
      header: 'ID',
      cell: ({ row }) => {
        const internalId = row.getValue('internalId') as string;
        return <div>{internalId || ''}</div>;
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
      id: 'actions',
      header: dict.columns.actions,
      cell: ({ row }) => {
        const submission = row.original;
        // State to control dialogs
        const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
        const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
        const [isMarkAsAccountedDialogOpen, setIsMarkAsAccountedDialogOpen] =
          useState(false);
        const [isConvertToPayoutDialogOpen, setIsConvertToPayoutDialogOpen] =
          useState(false);
        const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
        const [isScheduleDayOffDialogOpen, setIsScheduleDayOffDialogOpen] =
          useState(false);

        // Get user email and roles for permission checks
        const userEmail = session?.user?.email;
        const userRoles = session?.user?.roles || [];
        const isAuthor = submission.submittedBy === userEmail;

        // Check if user has HR or admin role
        const isHR = userRoles.includes('hr');
        const isAdmin = userRoles.includes('admin');

        // Check permissions
        const canApproveReject =
          (submission.supervisor === userEmail || isHR || isAdmin) &&
          submission.status === 'pending';
        const canApprovePlantManager =
          (userRoles.includes('plant-manager') || isAdmin) &&
          (submission.status as string) === 'pending-plant-manager';

        // Correction permissions:
        // - Author: only when status is pending
        // - HR: when status is pending or approved
        // - Admin: all statuses except accounted
        const canCorrect =
          (isAuthor && submission.status === 'pending') ||
          (isHR && ['pending', 'approved'].includes(submission.status)) ||
          (isAdmin && submission.status !== 'accounted');

        // Delete permission: admin only, all statuses
        const canDelete = isAdmin;

        const hasMarkAsAccountedAction =
          (isHR || isAdmin) && submission.status === 'approved';

        // Plant Manager can convert approved entries without payment/scheduledDayOff to payout
        const isPlantManager = userRoles.includes('plant-manager');
        const canConvertToPayout =
          (isPlantManager || isAdmin) &&
          submission.status === 'approved' &&
          !submission.payment &&
          !submission.scheduledDayOff;

        // Supervisor can schedule day off for pending-plant-manager submissions
        const canScheduleDayOff =
          submission.supervisor === userEmail &&
          submission.status === 'pending-plant-manager' &&
          !submission.scheduledDayOff;

        const hasActions =
          canCorrect ||
          canDelete ||
          canApproveReject ||
          canApprovePlantManager ||
          hasMarkAsAccountedAction ||
          canConvertToPayout ||
          canScheduleDayOff;

        if (!hasActions) {
          return null;
        }

        return (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' className='h-8 w-8 p-0'>
                  <MoreHorizontal className='h-4 w-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                {/* View Details - always available as first option */}
                <LocalizedLink href={`/overtime-submissions/${submission._id}`}>
                  <DropdownMenuItem>
                    <FileText className='mr-2 h-4 w-4' />
                    <span>{dict.actions.viewDetails}</span>
                  </DropdownMenuItem>
                </LocalizedLink>

                {/* Correction button */}
                {canCorrect && (
                  <LocalizedLink
                    href={`/overtime-submissions/${
                      submission.overtimeRequest
                        ? 'correct-work-order'
                        : 'correct-overtime'
                    }/${submission._id}`}
                  >
                    <DropdownMenuItem>
                      <Edit2 className='mr-2 h-4 w-4' />
                      <span>{dict.actions.correct}</span>
                    </DropdownMenuItem>
                  </LocalizedLink>
                )}

                {/* Delete button for admin */}
                {canDelete && (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setIsDeleteDialogOpen(true);
                    }}
                    className='focus:bg-red-400 dark:focus:bg-red-700'
                  >
                    <Trash2 className='mr-2 h-4 w-4' />
                    <span>{dict.actions.delete}</span>
                  </DropdownMenuItem>
                )}

                {/* Approve button */}
                {canApproveReject && (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setIsApproveDialogOpen(true);
                    }}
                  >
                    <Check className='mr-2 h-4 w-4' />
                    <span>{dict.actions.approve}</span>
                  </DropdownMenuItem>
                )}
                {/* Plant Manager Approve button */}
                {canApprovePlantManager && (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setIsApproveDialogOpen(true);
                    }}
                  >
                    <Check className='mr-2 h-4 w-4' />
                    <span>{dict.actions.approvePlantManager}</span>
                  </DropdownMenuItem>
                )}

                {/* Reject button */}
                {canApproveReject && (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setIsRejectDialogOpen(true);
                    }}
                    className='focus:bg-red-400 dark:focus:bg-red-700'
                  >
                    <X className='mr-2 h-4 w-4' />
                    <span>{dict.actions.reject}</span>
                  </DropdownMenuItem>
                )}

                {/* Mark as accounted button */}
                {hasMarkAsAccountedAction && (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setIsMarkAsAccountedDialogOpen(true);
                    }}
                  >
                    <Check className='mr-2 h-4 w-4' />
                    <span>{dict.actions.markAsAccounted}</span>
                  </DropdownMenuItem>
                )}

                {/* Convert to payout button (Plant Manager / Admin) */}
                {canConvertToPayout && (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setIsConvertToPayoutDialogOpen(true);
                    }}
                  >
                    <DollarSign className='mr-2 h-4 w-4' />
                    <span>{dict.actions.convertToPayout}</span>
                  </DropdownMenuItem>
                )}

                {/* Schedule day off button (Supervisor for pending-plant-manager) */}
                {canScheduleDayOff && (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setIsScheduleDayOffDialogOpen(true);
                    }}
                  >
                    <CalendarCheck className='mr-2 h-4 w-4' />
                    <span>{dict.actions.scheduleDayOff}</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Dialogs */}
            <ApproveSubmissionDialog
              isOpen={isApproveDialogOpen}
              onOpenChange={setIsApproveDialogOpen}
              submissionId={submission._id}
              session={session}
              dict={dict}
            />
            <RejectSubmissionDialog
              isOpen={isRejectDialogOpen}
              onOpenChange={setIsRejectDialogOpen}
              submissionId={submission._id}
              session={session}
              dict={dict}
            />
            <MarkAsAccountedDialog
              isOpen={isMarkAsAccountedDialogOpen}
              onOpenChange={setIsMarkAsAccountedDialogOpen}
              submissionId={submission._id}
              session={session}
              dict={dict}
            />
            <DeleteSubmissionDialog
              isOpen={isDeleteDialogOpen}
              onOpenChange={setIsDeleteDialogOpen}
              submissionId={submission._id}
              dict={dict}
            />
            <ConvertToPayoutDialog
              isOpen={isConvertToPayoutDialogOpen}
              onOpenChange={setIsConvertToPayoutDialogOpen}
              submissionId={submission._id}
              session={session}
              dict={dict}
            />
            <SupervisorScheduleDayoffDialog
              isOpen={isScheduleDayOffDialogOpen}
              onOpenChange={setIsScheduleDayOffDialogOpen}
              submissionId={submission._id}
              dict={dict}
            />
          </>
        );
      },
    },
    {
      accessorKey: 'submittedBy',
      header: dict.columns.submittedBy,
      cell: ({ row }) => {
        const email = row.getValue('submittedBy') as string;
        return (
          <span className='whitespace-nowrap'>
            {extractNameFromEmail(email)}
          </span>
        );
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
