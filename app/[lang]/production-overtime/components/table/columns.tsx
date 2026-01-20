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
import { formatDateTime } from '@/lib/utils/date-format';
import { extractNameFromEmail } from '@/lib/utils/name-format';
import { ColumnDef } from '@tanstack/react-table';
import {
  CalendarClock,
  Check,
  Download,
  Edit,
  MoreHorizontal,
  Paperclip,
  X,
} from 'lucide-react';
import { Session } from 'next-auth';
import Link from 'next/link';
import { useState } from 'react';
import { Dictionary } from '../../lib/dict';
import { OvertimeType } from '../../lib/types';
import AddAttachmentDialog from '../add-attachment-dialog';
import ApproveRequestDialog from '../approve-request-dialog';
import CancelRequestDialog from '../cancel-request-dialog';
import MarkAsAccountedDialog from '../mark-as-accounted-dialog';

// Creating a columns factory function that takes the session and dict
export const createColumns = (
  session: Session | null,
  dict: Dictionary,
): ColumnDef<OvertimeType>[] => {
  // Check if the user has plant-manager or admin role
  const isPlantManager = session?.user?.roles?.includes('plant-manager');
  const isAdmin = session?.user?.roles?.includes('admin');
  const isHR = session?.user?.roles?.includes('hr');
  const canApprove = isPlantManager || isAdmin;

  const allColumns: ColumnDef<OvertimeType>[] = [
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
        const isPlantManager = userRoles.includes('plant-manager');
        const isHR = userRoles.includes('hr');
        const userEmail = session?.user?.email;
        const request = row.original;

        const canApprove =
          (isPlantManager || isAdmin) && request.status === 'pending';
        const canMarkAsAccounted = isHR && request.status === 'completed';
        const canCancel =
          request._id &&
          request.status !== 'completed' &&
          request.status !== 'canceled' &&
          request.status !== 'accounted' &&
          (request.requestedBy === userEmail ||
            isPlantManager ||
            isAdmin ||
            userRoles.includes('group-leader') ||
            userRoles.includes('production-manager') ||
            userRoles.includes('hr'));

        const canSelect = canApprove || canMarkAsAccounted || canCancel;

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
      accessorKey: 'status',
      header: dict.tableColumns.status,
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        let statusLabel;

        switch (status) {
          case 'pending':
            statusLabel = (
              <Badge variant='statusPending' className='text-nowrap'>
                {dict.tableColumns.statuses.pending}
              </Badge>
            );
            break;
          case 'approved':
            statusLabel = (
              <Badge variant='statusApproved'>
                {dict.tableColumns.statuses.approved}
              </Badge>
            );
            break;
          case 'canceled':
            statusLabel = (
              <Badge variant='statusRejected'>
                {dict.tableColumns.statuses.canceled}
              </Badge>
            );
            break;
          case 'completed':
            statusLabel = (
              <Badge variant='statusClosed'>
                {dict.tableColumns.statuses.completed}
              </Badge>
            );
            break;
          case 'accounted':
            statusLabel = (
              <Badge variant='statusAccounted'>
                {dict.tableColumns.statuses.accounted}
              </Badge>
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
      header: dict.tableColumns.actions,
      cell: ({ row }) => {
        const request = row.original;
        // State to control the attachment dialog
        const [isAttachmentDialogOpen, setIsAttachmentDialogOpen] =
          useState(false);
        // State to control the cancel dialog
        const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
        // State to control the mark as accounted dialog
        const [isMarkAsAccountedDialogOpen, setIsMarkAsAccountedDialogOpen] =
          useState(false);
        // State to control the approve dialog
        const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);

        // Get user roles and email for permission checks
        const userRoles = session?.user?.roles || [];
        const userEmail = session?.user?.email;

        // Check if user can cancel the request
        const canCancel =
          request._id &&
          request.status !== 'completed' &&
          request.status !== 'canceled' &&
          request.status !== 'accounted' &&
          (request.requestedBy === userEmail ||
            isPlantManager ||
            isAdmin ||
            userRoles.includes('group-leader') ||
            userRoles.includes('production-manager') ||
            userRoles.includes('hr') ||
            userRoles.includes('admin'));

        // Check if user can add attachment (same logic as in AddAttachmentDialog)
        const canAddAttachment =
          userRoles.some((role: string) =>
            [
              'group-leader',
              'production-manager',
              'plant-manager',
              'hr',
              'admin',
            ].includes(role),
          ) ||
          userEmail === request.requestedBy ||
          userEmail === request.responsibleEmployee;

        // Check if user can edit
        // For canceled and accounted statuses - only admin can edit
        // For other statuses: Admin, HR, and plant-manager can edit always
        // Author can edit only pending status
        const canEdit =
          request.status === 'canceled' || request.status === 'accounted'
            ? userRoles.includes('admin')
            : (request.requestedBy === userEmail &&
                request.status === 'pending') ||
              userRoles.includes('admin') ||
              userRoles.includes('hr') ||
              userRoles.includes('plant-manager');

        // Check if there are any actions available
        const hasOvertimePickupAction = request.status !== 'canceled';
        const hasApproveAction = canApprove && request.status === 'pending'; // Only pending requests can be approved
        const hasMarkAsAccountedAction = isHR && request.status === 'completed'; // Only completed requests can be marked as accounted
        const hasAddAttachmentAction =
          request._id && request.status === 'approved' && canAddAttachment;
        const hasDownloadAttachmentAction =
          request._id && request.hasAttachment;

        const hasActions =
          hasOvertimePickupAction ||
          hasApproveAction ||
          hasMarkAsAccountedAction ||
          canCancel ||
          canEdit ||
          hasAddAttachmentAction ||
          hasDownloadAttachmentAction;

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
                {request.status !== 'canceled' && (
                  <>
                    <LocalizedLink href={`/production-overtime/${request._id}`}>
                      <DropdownMenuItem>
                        <CalendarClock />
                        <span>{dict.tableColumns.overtimePickup}</span>
                      </DropdownMenuItem>
                    </LocalizedLink>
                    {/* Edit button - only for author and pending/approved status */}
                    {canEdit && (
                      <LocalizedLink
                        href={`/production-overtime/${request._id}/edit`}
                      >
                        <DropdownMenuItem>
                          <Edit />
                          <span>{dict.tableColumns.editRequest}</span>
                        </DropdownMenuItem>
                      </LocalizedLink>
                    )}
                    {/* Only show approve button if user can approve */}
                    {canApprove &&
                      request.status !== 'approved' &&
                      request.status !== 'completed' &&
                      request.status !== 'accounted' && (
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            setIsApproveDialogOpen(true);
                          }}
                        >
                          <Check />
                          <span>{dict.tableColumns.approve}</span>
                        </DropdownMenuItem>
                      )}
                    {/* Mark as accounted button - only for HR and approved requests */}
                    {hasMarkAsAccountedAction && (
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          setIsMarkAsAccountedDialogOpen(true);
                        }}
                      >
                        <Check />
                        <span>{dict.tableColumns.markAsAccounted}</span>
                      </DropdownMenuItem>
                    )}
                  </>
                )}

                {/* Cancel button - show for non-completed requests */}
                {canCancel && (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setIsCancelDialogOpen(true);
                    }}
                    className='focus:bg-red-400 dark:focus:bg-red-700'
                  >
                    <X />
                    <span>{dict.tableColumns.cancelRequest}</span>
                  </DropdownMenuItem>
                )}

                {/* Add attachment button - only for approved orders and authorized users */}
                {hasAddAttachmentAction && (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setIsAttachmentDialogOpen(true);
                    }}
                  >
                    <Paperclip />
                    <span>{dict.tableColumns.addAttendanceList}</span>
                  </DropdownMenuItem>
                )}

                {/* Download attachment button - show if attachment exists */}
                {request._id && request.hasAttachment && (
                  <Link
                    href={`/api/production-overtime/download?overTimeRequestId=${request._id}`}
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    <DropdownMenuItem>
                      <Download />
                      <span>{dict.tableColumns.downloadAttachment}</span>
                    </DropdownMenuItem>
                  </Link>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Dialog outside of DropdownMenuContent */}
            {request._id && (
              <>
                <AddAttachmentDialog
                  id={request._id}
                  status={request.status}
                  owner={request.requestedBy}
                  responsibleEmployee={request.responsibleEmployee}
                  session={session}
                  isOpen={isAttachmentDialogOpen}
                  onOpenChange={setIsAttachmentDialogOpen}
                />
                <CancelRequestDialog
                  isOpen={isCancelDialogOpen}
                  onOpenChange={setIsCancelDialogOpen}
                  requestId={request._id}
                  dict={dict}
                />
                <ApproveRequestDialog
                  isOpen={isApproveDialogOpen}
                  onOpenChange={setIsApproveDialogOpen}
                  requestId={request._id}
                  session={session}
                  dict={dict}
                />
                <MarkAsAccountedDialog
                  isOpen={isMarkAsAccountedDialogOpen}
                  onOpenChange={setIsMarkAsAccountedDialogOpen}
                  requestId={request._id}
                  session={session}
                  dict={dict}
                />
              </>
            )}
          </>
        );
      },
    },
    {
      accessorKey: 'approved',
      header: dict.tableColumns.approvalDate,
      cell: ({ row }) => {
        const approvedAt = row.original.approvedAt;
        const approvedAtString = formatDateTime(approvedAt);
        return <div>{approvedAtString}</div>;
      },
    },
    {
      accessorKey: 'fromLocaleString',
      header: dict.tableColumns.from,
      cell: ({ row }) => {
        const from = row.original.from;
        const fromString = formatDateTime(from);
        return <div>{fromString}</div>;
      },
    },
    {
      accessorKey: 'toLocaleString',
      header: dict.tableColumns.to,
      cell: ({ row }) => {
        const to = row.original.to;
        const toString = formatDateTime(to);
        return <div>{toString}</div>;
      },
    },
    {
      accessorKey: 'numberOfEmployees',
      header: dict.tableColumns.numberOfEmployees,
      cell: ({ row }) => {
        const numberOfEmployees = row.getValue('numberOfEmployees') as number;
        return <div>{numberOfEmployees || 0}</div>;
      },
    },
    {
      accessorKey: 'numberOfShifts',
      header: dict.tableColumns.numberOfShifts,
      cell: ({ row }) => {
        const numberOfShifts = row.getValue('numberOfShifts') as number;
        return <div>{numberOfShifts || 1}</div>;
      },
    },
    {
      id: 'totalHours',
      header: dict.tableColumns.totalHours,
      cell: ({ row }) => {
        const fromDate = new Date(row.original.from);
        const toDate = new Date(row.original.to);
        const numberOfEmployees = row.original.numberOfEmployees || 0;
        const numberOfShifts = row.original.numberOfShifts || 1;

        // Calculate hours per employee
        const hoursPerEmployee =
          Math.round(
            ((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60)) * 100,
          ) / 100;

        // Calculate total hours for all employees divided by number of shifts
        const totalHours =
          (hoursPerEmployee * numberOfEmployees) / numberOfShifts;

        return <div>{totalHours > 0 ? `${totalHours}h` : '-'}</div>;
      },
    },
    {
      accessorKey: 'employeesWithScheduledDayOff',
      header: dict.tableColumns.dayOffPickup,
      cell: ({ row }) => {
        const employees = row.getValue('employeesWithScheduledDayOff');
        return <div>{Array.isArray(employees) ? employees.length : 0}</div>;
      },
    },
    {
      accessorKey: 'reason',
      header: dict.tableColumns.reason,
      cell: ({ row }) => {
        const reason = row.getValue('reason');
        return <div className='w-[250px] text-justify'>{reason as string}</div>;
      },
    },
    {
      accessorKey: 'responsibleEmployee',
      header: dict.tableColumns.responsibleEmployee,
      cell: ({ row }) => {
        const responsibleEmployee = row.getValue('responsibleEmployee');
        return (
          <div className='whitespace-nowrap'>
            {extractNameFromEmail(responsibleEmployee as string)}
          </div>
        );
      },
    },

    {
      accessorKey: 'requestedBy',
      header: dict.tableColumns.requestedBy,
      cell: ({ row }) => {
        const requestedBy = row.getValue('requestedBy');
        return (
          <div className='whitespace-nowrap'>
            {extractNameFromEmail(requestedBy as string)}
          </div>
        );
      },
    },
    {
      accessorKey: 'requestedAtLocaleString',
      header: dict.tableColumns.requestedAt,
      cell: ({ row }) => {
        const requestedAt = row.original.requestedAt;
        const requestedAtString = formatDateTime(requestedAt);
        return <div>{requestedAtString}</div>;
      },
    },

    {
      accessorKey: 'editedBy',
      header: dict.tableColumns.editedBy,
      cell: ({ row }) => {
        const editedBy = row.original.editedBy;
        return (
          <div className='whitespace-nowrap'>
            {editedBy ? extractNameFromEmail(editedBy) : '-'}
          </div>
        );
      },
    },
    {
      accessorKey: 'editedAtLocaleString',
      header: dict.tableColumns.editedAt,
      cell: ({ row }) => {
        const editedAt = row.original.editedAt;
        const editedAtString = formatDateTime(editedAt);
        return <div>{editedAtString}</div>;
      },
    },

    {
      accessorKey: 'completedBy',
      header: dict.tableColumns.completedBy,
      cell: ({ row }) => {
        const completedBy = row.original.completedBy;
        return (
          <div className='whitespace-nowrap'>
            {completedBy ? extractNameFromEmail(completedBy) : '-'}
          </div>
        );
      },
    },
    {
      accessorKey: 'completedAtLocaleString',
      header: dict.tableColumns.completedAt,
      cell: ({ row }) => {
        const completedAt = row.original.completedAt;
        const completedAtString = formatDateTime(completedAt);
        return <div>{completedAtString}</div>;
      },
    },
    {
      accessorKey: 'accountedBy',
      header: dict.tableColumns.accountedBy,
      cell: ({ row }) => {
        const accountedBy = row.original.accountedBy;
        return (
          <div className='whitespace-nowrap'>
            {accountedBy ? extractNameFromEmail(accountedBy) : '-'}
          </div>
        );
      },
    },
    {
      accessorKey: 'accountedAtLocaleString',
      header: dict.tableColumns.accountedAt,
      cell: ({ row }) => {
        const accountedAt = row.original.accountedAt;
        const accountedAtString = formatDateTime(accountedAt);
        return <div>{accountedAtString}</div>;
      },
    },
    {
      accessorKey: 'canceledBy',
      header: dict.tableColumns.canceledBy,
      cell: ({ row }) => {
        const canceledBy = row.original.canceledBy;
        return (
          <div className='whitespace-nowrap'>
            {canceledBy ? extractNameFromEmail(canceledBy) : '-'}
          </div>
        );
      },
    },
    {
      accessorKey: 'canceledAtLocaleString',
      header: dict.tableColumns.canceledAt,
      cell: ({ row }) => {
        const canceledAt = row.original.canceledAt;
        const canceledAtString = formatDateTime(canceledAt);
        return <div>{canceledAtString}</div>;
      },
    },
    {
      accessorKey: 'note',
      header: dict.tableColumns.additionalInfo,
      cell: ({ row }) => {
        const note = row.getValue('note');
        return <div className='w-[250px] text-justify'>{note as string}</div>;
      },
    },
  ];

  // Filter out actions column for unauthenticated users
  return session
    ? allColumns
    : allColumns.filter((col) => col.id !== 'actions');
};
