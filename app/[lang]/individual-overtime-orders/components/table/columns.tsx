'use client';

import LocalizedLink from '@/components/localized-link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate, formatTime } from '@/lib/utils/date-format';
import { extractNameFromEmail } from '@/lib/utils/name-format';
import { ColumnDef } from '@tanstack/react-table';
import {
  Banknote,
  CalendarCheck,
  Check,
  Eye,
  Mail,
  MailX,
  MoreHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { Session } from 'next-auth';
import { Dictionary } from '../../lib/dict';
import { IndividualOvertimeOrderType } from '../../lib/types';

// Creating a columns factory function that takes the session, dict, and options
export const createColumns = (
  session: Session | null,
  dict: Dictionary,
  options?: { showSupervisorColumn?: boolean },
): ColumnDef<IndividualOvertimeOrderType>[] => {
  const showSupervisorColumn = options?.showSupervisorColumn ?? true;

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
        const session = (table.options.meta as { session: Session | null })
          ?.session;
        const userRoles = session?.user?.roles || [];
        const isAdmin = userRoles.includes('admin');
        const isPlantManager = userRoles.includes('plant-manager');
        const isHR = userRoles.includes('hr');
        const isSupervisor = userRoles.some((r: string) =>
          /leader|manager/i.test(r),
        );
        const userEmail = session?.user?.email;
        const order = row.original;
        const status = order.status;

        // Approve permission check
        const canApprove =
          (status === 'pending' &&
            (order.supervisor === userEmail ||
              isSupervisor ||
              isHR ||
              isAdmin)) ||
          (status === 'pending-plant-manager' && (isPlantManager || isAdmin));

        // Mark as accounted permission check
        const canMarkAsAccounted = (isHR || isAdmin) && status === 'approved';

        // Cancel permission check
        const canCancel =
          (status === 'pending' || status === 'pending-plant-manager') &&
          (order.createdBy === userEmail ||
            order.supervisor === userEmail ||
            isSupervisor ||
            isHR ||
            isAdmin ||
            isPlantManager);

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
      accessorKey: 'internalId',
      header: 'ID',
      cell: ({ row }) => {
        const internalId = row.getValue('internalId') as string;
        return <span>{internalId || '-'}</span>;
      },
    },
    {
      id: 'employee',
      header: dict.columns.employee || 'Employee',
      cell: ({ row }) => {
        const order = row.original;
        const employeeName = order.employeeName;
        const employeeIdentifier = order.employeeIdentifier;
        const emailSent = order.emailNotificationSent === true;

        if (!employeeName) return <span>-</span>;

        return (
          <div className='flex items-center gap-1.5 whitespace-nowrap'>
            <span>
              {employeeName}
              {employeeIdentifier && (
                <span className='text-muted-foreground'>
                  {' '}
                  ({employeeIdentifier})
                </span>
              )}
            </span>
            {emailSent ? (
              <span title={dict.columns.emailSent || 'Email notification sent'}>
                <Mail className='h-3.5 w-3.5 text-green-600' />
              </span>
            ) : (
              <span title={dict.columns.noEmail || 'No email'}>
                <MailX className='h-3.5 w-3.5 text-muted-foreground' />
              </span>
            )}
          </div>
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
    {
      id: 'actions',
      header: dict.columns?.actions || 'Actions',
      cell: ({ row, table }) => {
        const order = row.original;
        const status = order.status;
        const meta = table.options.meta as {
          session: Session | null;
          onCancelClick?: (id: string) => void;
          onApproveClick?: (id: string) => void;
          onRejectClick?: (id: string) => void;
          onMarkAccountedClick?: (id: string) => void;
          onDeleteClick?: (id: string) => void;
          returnUrl?: string;
        };
        const returnUrl = meta?.returnUrl;

        // Get user info from session
        const userEmail = meta?.session?.user?.email;
        const userRoles = meta?.session?.user?.roles || [];
        const isAdmin = userRoles.includes('admin');
        const isPlantManager = userRoles.includes('plant-manager');
        const isHR = userRoles.includes('hr');
        const isSupervisor =
          order.supervisor === userEmail ||
          userRoles.some((r: string) => /leader|manager/i.test(r));

        // Permission checks (matching detail-actions.tsx logic)
        const canCancel =
          (status === 'pending' || status === 'pending-plant-manager') &&
          (order.createdBy === userEmail ||
            order.supervisor === userEmail ||
            isSupervisor ||
            isHR ||
            isAdmin ||
            isPlantManager);

        const canApprove =
          (status === 'pending' &&
            (order.supervisor === userEmail || isSupervisor || isHR || isAdmin)) ||
          (status === 'pending-plant-manager' && (isPlantManager || isAdmin));

        const canReject =
          (status === 'pending' || status === 'pending-plant-manager') &&
          (order.supervisor === userEmail ||
            isSupervisor ||
            isPlantManager ||
            isHR ||
            isAdmin);

        const canMarkAsAccounted =
          status === 'approved' && (isHR || isAdmin);

        const canDelete = isAdmin;

        // Build detail URL with returnUrl param if available
        const detailUrl = returnUrl
          ? `/individual-overtime-orders/${order._id}?returnUrl=${encodeURIComponent(returnUrl)}`
          : `/individual-overtime-orders/${order._id}`;

        const hasActions = canApprove || canReject || canMarkAsAccounted || canCancel || canDelete;

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

              {hasActions && <DropdownMenuSeparator />}

              {canApprove && meta?.onApproveClick && (
                <DropdownMenuItem
                  onClick={() => meta.onApproveClick!(order._id)}
                >
                  <Check />
                  {dict.actions?.approve || 'Approve'}
                </DropdownMenuItem>
              )}

              {canReject && meta?.onRejectClick && (
                <DropdownMenuItem
                  onClick={() => meta.onRejectClick!(order._id)}
                  className='text-destructive focus:text-destructive'
                >
                  <X />
                  {dict.actions?.reject || 'Reject'}
                </DropdownMenuItem>
              )}

              {canMarkAsAccounted && meta?.onMarkAccountedClick && (
                <DropdownMenuItem
                  onClick={() => meta.onMarkAccountedClick!(order._id)}
                >
                  <Check />
                  {dict.actions?.markAsAccounted || 'Mark as settled'}
                </DropdownMenuItem>
              )}

              {canCancel && meta?.onCancelClick && (
                <DropdownMenuItem
                  onClick={() => meta.onCancelClick!(order._id)}
                  className='text-destructive focus:text-destructive'
                >
                  <X />
                  {dict.actions?.cancelSubmission || 'Cancel'}
                </DropdownMenuItem>
              )}

              {canDelete && meta?.onDeleteClick && (
                <DropdownMenuItem
                  onClick={() => meta.onDeleteClick!(order._id)}
                  className='text-destructive focus:text-destructive'
                >
                  <Trash2 />
                  {dict.actions?.delete || 'Delete'}
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
            <Badge variant='typeDayOff' className='flex-col items-start gap-0.5'>
              <span className='flex items-center gap-1.5'>
                <CalendarCheck className='h-3 w-3' />
                {dict.columns.typeDayOff}:
              </span>
              <span>{formatDate(scheduledDayOff)}</span>
            </Badge>
          );
        }
        return null;
      },
    },
    ...(showSupervisorColumn
      ? [
          {
            accessorKey: 'supervisor',
            header: dict.columns.supervisor,
            cell: ({ row }: { row: any }) => {
              const email = row.getValue('supervisor') as string;
              return (
                <span className='whitespace-nowrap'>
                  {extractNameFromEmail(email)}
                </span>
              );
            },
          },
        ]
      : []),
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
