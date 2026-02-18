'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { extractNameFromEmail } from '@/lib/utils/name-format';
import { formatDate } from '@/lib/utils/date-format';
import { ColumnDef } from '@tanstack/react-table';
import {
  ArrowUpDown,
  CalendarClock,
  Check,
  CheckCircle,
  Download,
  Edit,
  FileText,
  MoreHorizontal,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { Session } from 'next-auth';
import { useState } from 'react';
import Link from 'next/link';
import LocalizedLink from '@/components/localized-link';
import { Dictionary } from '../../lib/dict';
import { DepartmentConfig, OvertimeType } from '../../lib/types';
import ApproveRequestDialog from '../approve-request-dialog';
import PreApproveRequestDialog from '../pre-approve-request-dialog';
import CancelRequestDialog from '../cancel-request-dialog';
import MarkAsAccountedDialog from '../mark-as-accounted-dialog';
import DeleteRequestDialog from '../delete-request-dialog';
import ReactivateRequestDialog from '../reactivate-request-dialog';

export const createColumns = (
  session: Session | null,
  dict: Dictionary,
  departments?: DepartmentConfig[],
  lang?: string,
): ColumnDef<OvertimeType>[] => {
  const isPlantManager = session?.user?.roles?.includes('plant-manager');
  const isAdmin = session?.user?.roles?.includes('admin');
  const isHR = session?.user?.roles?.includes('hr');
  const isProductionManager = session?.user?.roles?.includes('production-manager');
  const canApprove = isPlantManager || isAdmin;
  const canPreApprove = isProductionManager || isAdmin;

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
        const session = (table.options.meta as any)?.session;
        const userRoles = session?.user?.roles || [];
        const isAdmin = userRoles.includes('admin');
        const isPlantManager = userRoles.includes('plant-manager');
        const isProductionManager = userRoles.includes('production-manager');
        const isHR = userRoles.includes('hr');
        const userEmail = session?.user?.email;
        const request = row.original;

        const canPreApprove =
          (isProductionManager || isAdmin) &&
          request.status === 'pending' &&
          request.department !== 'logistics';
        const canApprove =
          (isPlantManager || isAdmin) &&
          ((request.department === 'logistics' && request.status === 'pending') ||
            (request.department !== 'logistics' && request.status === 'pre_approved'));
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

        const canSelect = canPreApprove || canApprove || canMarkAsAccounted || canCancel;

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
      header: ({ column }) => (
        <Button
          variant='ghost'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          ID
          <ArrowUpDown />
        </Button>
      ),
      cell: ({ row }) => {
        const internalId = row.getValue('internalId') as string;
        return <div>{internalId}</div>;
      },
      enableSorting: true,
      sortingFn: (rowA, rowB, columnId) => {
        const aValue = rowA.getValue(columnId) as string;
        const bValue = rowB.getValue(columnId) as string;

        if (!aValue || !bValue) return 0;

        // Extract number part from ID format "N/YY"
        const aMatch = aValue.match(/^(\d+)\//);
        const bMatch = bValue.match(/^(\d+)\//);

        if (aMatch && bMatch) {
          const aNum = parseInt(aMatch[1], 10);
          const bNum = parseInt(bMatch[1], 10);
          return aNum - bNum;
        }

        // Fallback to string comparison
        return aValue.localeCompare(bValue);
      },
    },
    {
      accessorKey: 'department',
      header: dict.department.label,
      cell: ({ row }) => {
        const department = row.getValue('department') as string;
        const quarry = row.original.quarry;
        const departmentConfig = departments?.find(
          (dept) => dept.value === department,
        );
        let displayName: string | undefined;
        if (lang === 'pl') {
          displayName = departmentConfig?.namePl;
        } else if (lang === 'de') {
          displayName = departmentConfig?.nameDe;
        } else {
          displayName = departmentConfig?.name;
        }
        displayName = displayName || department || dict.department.unknown;
        return <div>{quarry ? `${displayName} (${quarry})` : displayName}</div>;
      },
    },
    {
      accessorKey: 'status',
      header: dict.tableColumns.status,
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        const department = row.original.department;
        let statusLabel;

        switch (status) {
          case 'pending':
            if (department === 'logistics') {
              statusLabel = (
                <Badge variant='statusPreApproved' className='text-nowrap'>
                  {dict.tableColumns.statuses.pendingPlantManager}
                </Badge>
              );
            } else {
              statusLabel = (
                <Badge variant='statusPending' className='text-nowrap'>
                  {dict.tableColumns.statuses.pendingProductionManager}
                </Badge>
              );
            }
            break;
          case 'pre_approved':
            statusLabel = (
              <Badge variant='statusPreApproved' className='text-nowrap'>
                {dict.tableColumns.statuses.pendingPlantManager}
              </Badge>
            );
            break;
          case 'approved':
            statusLabel = <Badge variant='statusApproved'>{dict.tableColumns.statuses.approved}</Badge>;
            break;
          case 'canceled':
            statusLabel = <Badge variant='statusRejected'>{dict.tableColumns.statuses.canceled}</Badge>;
            break;
          case 'completed':
            statusLabel = <Badge variant='statusClosed'>{dict.tableColumns.statuses.completed}</Badge>;
            break;
          case 'accounted':
            statusLabel = <Badge variant='statusAccounted'>{dict.tableColumns.statuses.accounted}</Badge>;
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

        const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
        const [isMarkAsAccountedDialogOpen, setIsMarkAsAccountedDialogOpen] =
          useState(false);
        const [isPreApproveDialogOpen, setIsPreApproveDialogOpen] = useState(false);
        const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
        const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
        const [isReactivateDialogOpen, setIsReactivateDialogOpen] = useState(false);

        const userRoles = session?.user?.roles || [];
        const userEmail = session?.user?.email;

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

        const canEdit =
          request.status === 'canceled' || request.status === 'accounted'
            ? userRoles.includes('admin')
            : (request.requestedBy === userEmail &&
                request.status === 'pending') ||
              userRoles.includes('admin') ||
              userRoles.includes('hr') ||
              userRoles.includes('plant-manager');

        const hasOvertimePickupAction = request.status !== 'canceled';
        const hasPreApproveAction =
          canPreApprove &&
          request.status === 'pending' &&
          request.department !== 'logistics';
        const hasApproveAction =
          canApprove &&
          ((request.department === 'logistics' && request.status === 'pending') ||
            (request.department !== 'logistics' && request.status === 'pre_approved'));
        const hasMarkAsAccountedAction = (isHR || isAdmin) && request.status === 'completed';
        const hasAddAttachmentAction =
          request._id && request.status === 'approved' && canAddAttachment;
        const hasDownloadAttachmentAction =
          request._id && request.hasAttachment;

        const hasActions =
          hasOvertimePickupAction ||
          hasPreApproveAction ||
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
                <LocalizedLink href={`/overtime-orders/${request._id}`}>
                  <DropdownMenuItem>
                    <FileText />
                    <span>{dict.tableColumnsExtra.orderDetails}</span>
                  </DropdownMenuItem>
                </LocalizedLink>

                {request.status !== 'canceled' && (
                  <>
                    <LocalizedLink href={`/overtime-orders/${request._id}/pickups`}>
                      <DropdownMenuItem>
                        <CalendarClock />
                        <span>{dict.tableColumns.overtimePickup}</span>
                      </DropdownMenuItem>
                    </LocalizedLink>
                    {canEdit && (
                      <LocalizedLink href={`/overtime-orders/${request._id}/edit`}>
                        <DropdownMenuItem>
                          <Edit />
                          <span>{dict.tableColumns.editRequest}</span>
                        </DropdownMenuItem>
                      </LocalizedLink>
                    )}
                    {hasPreApproveAction && (
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          setIsPreApproveDialogOpen(true);
                        }}
                      >
                        <Check />
                        <span>{dict.tableColumns.preApprove}</span>
                      </DropdownMenuItem>
                    )}
                    {hasApproveAction && (
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

                {hasAddAttachmentAction && (
                  <LocalizedLink href={`/overtime-orders/${request._id}/complete`}>
                    <DropdownMenuItem>
                      <CheckCircle />
                      <span>{dict.tableColumnsExtra.closeOrder}</span>
                    </DropdownMenuItem>
                  </LocalizedLink>
                )}

                {request._id && request.hasAttachment && (
                  <Link
                    href={`/api/overtime-orders/download?overTimeRequestId=${request._id}`}
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    <DropdownMenuItem>
                      <Download />
                      <span>{dict.tableColumns.downloadAttachment}</span>
                    </DropdownMenuItem>
                  </Link>
                )}

                {(isAdmin || isHR) && request.status === 'canceled' && (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setIsReactivateDialogOpen(true);
                    }}
                  >
                    <RotateCcw />
                    <span>{dict.tableColumnsExtra.reactivateOrder}</span>
                  </DropdownMenuItem>
                )}
                {canCancel && (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setIsCancelDialogOpen(true);
                    }}
                    className='text-destructive focus:bg-destructive focus:text-destructive-foreground'
                  >
                    <X />
                    <span>{dict.tableColumns.cancelRequest}</span>
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setIsDeleteDialogOpen(true);
                    }}
                    className='text-destructive focus:bg-destructive focus:text-destructive-foreground'
                  >
                    <Trash2 />
                    <span>{dict.tableColumnsExtra.deleteOrder}</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {request._id && (
              <>
                <CancelRequestDialog
                  isOpen={isCancelDialogOpen}
                  onOpenChange={setIsCancelDialogOpen}
                  requestId={request._id}
                  dict={dict}
                />
                <PreApproveRequestDialog
                  isOpen={isPreApproveDialogOpen}
                  onOpenChange={setIsPreApproveDialogOpen}
                  requestId={request._id}
                  session={session}
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
                <DeleteRequestDialog
                  isOpen={isDeleteDialogOpen}
                  onOpenChange={setIsDeleteDialogOpen}
                  requestId={request._id}
                  dict={dict}
                />
                <ReactivateRequestDialog
                  isOpen={isReactivateDialogOpen}
                  onOpenChange={setIsReactivateDialogOpen}
                  requestId={request._id}
                  dict={dict}
                />
              </>
            )}
          </>
        );
      },
    },
    {
      id: 'period',
      header: dict.tableColumnsExtra.date,
      cell: ({ row }) => {
        const from = new Date(row.original.from);
        const to = new Date(row.original.to);

        const fromDate = formatDate(from);
        const toDate = formatDate(to);

        const formatTime = (date: Date) =>
          `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

        const timeRange = `${formatTime(from)}–${formatTime(to)}`;

        // Check if it's the same day
        if (fromDate === toDate) {
          return (
            <div className='text-sm'>
              <div>{fromDate}</div>
              <div className='text-xs text-muted-foreground'>
                {timeRange}
              </div>
            </div>
          );
        }

        // Check if it's consecutive days in the same month/year
        const fromDay = from.getDate();
        const toDay = to.getDate();
        const sameMonth =
          from.getMonth() === to.getMonth() &&
          from.getFullYear() === to.getFullYear();

        if (sameMonth && toDay === fromDay + 1) {
          const month = (from.getMonth() + 1).toString().padStart(2, '0');
          const year = from.getFullYear();
          return (
            <div className='text-sm'>
              <div>
                {fromDay}-{toDay}.{month}.{year}
              </div>
              <div className='text-xs text-muted-foreground'>
                {timeRange}
              </div>
            </div>
          );
        }

        // Different dates, show full range with hyphen
        return (
          <div className='text-sm'>
            <div>{fromDate}</div>
            <div className='text-muted-foreground'>- {toDate}</div>
            <div className='text-xs text-muted-foreground'>
              {timeRange}
            </div>
          </div>
        );
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
        const reason = row.getValue('reason') as string;
        return <div className='min-w-[300px] whitespace-pre-line'>{reason || '-'}</div>;
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
  ];
};
