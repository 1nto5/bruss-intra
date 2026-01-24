'use client';

import LocalizedLink from '@/components/localized-link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardContent, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Locale } from '@/lib/config/i18n';
import { formatDateWithDay } from '@/lib/utils/date-format';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  RowSelectionState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import {
  ArrowRight,
  Calendar,
  Check,
  Edit2,
  Eye,
  MoreHorizontal,
  X,
} from 'lucide-react';
import { Session } from 'next-auth';
import * as React from 'react';
import { Dictionary } from '../lib/dict';
import { OvertimeSubmissionType } from '../lib/types';
import ApproveSubmissionDialog from './approve-submission-dialog';
import RejectSubmissionDialog from './reject-submission-dialog';
import MarkAsAccountedDialog from './mark-as-accounted-dialog';
import BulkActions from './bulk-actions';

// Types for dialog state
type DialogType = 'approve' | 'reject' | 'markAccounted' | null;

interface EmployeeSubmissionsTableProps {
  submissions: OvertimeSubmissionType[];
  dict: Dictionary;
  session: Session;
  fetchTime: Date;
  employeeEmail?: string;
  isAdmin: boolean;
  isHR: boolean;
  isPlantManager: boolean;
  lang: Locale;
  showEmployeeColumn?: boolean;
  showSupervisorColumn?: boolean;
  returnUrl?: string;
}

export default function EmployeeSubmissionsTable({
  submissions,
  dict,
  session,
  fetchTime,
  employeeEmail,
  isAdmin,
  isHR,
  isPlantManager,
  lang,
  showEmployeeColumn = false,
  showSupervisorColumn = false,
  returnUrl,
}: EmployeeSubmissionsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  // Dialog state
  const [openDialog, setOpenDialog] = React.useState<DialogType>(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = React.useState<string | null>(null);

  // Reset selection when data changes
  React.useEffect(() => {
    setRowSelection({});
  }, [fetchTime]);

  const userEmail = session.user?.email || '';

  const openDialogForSubmission = (type: DialogType, submissionId: string) => {
    setSelectedSubmissionId(submissionId);
    setOpenDialog(type);
  };

  const closeDialog = () => {
    setOpenDialog(null);
    setSelectedSubmissionId(null);
  };

  const columns: ColumnDef<OvertimeSubmissionType>[] = React.useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label='Select all'
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label='Select row'
          />
        ),
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
      ...(showEmployeeColumn
        ? [
            {
              accessorKey: 'submittedByName',
              header: dict.allEntriesPage?.employee || 'Employee',
              cell: ({ row }: { row: { getValue: (key: string) => unknown } }) => {
                const name = row.getValue('submittedByName') as string;
                return <span className='whitespace-nowrap'>{name || '-'}</span>;
              },
            } as ColumnDef<OvertimeSubmissionType>,
          ]
        : []),
      ...(showSupervisorColumn
        ? [
            {
              accessorKey: 'supervisorName',
              header: dict.columns?.supervisor || 'Supervisor',
              cell: ({ row }: { row: { getValue: (key: string) => unknown } }) => {
                const name = row.getValue('supervisorName') as string;
                return <span className='whitespace-nowrap'>{name || '-'}</span>;
              },
            } as ColumnDef<OvertimeSubmissionType>,
          ]
        : []),
      {
        accessorKey: 'status',
        header: dict.columns.status,
        cell: ({ row }) => {
          const status = row.getValue('status') as string;
          let variant:
            | 'statusPending'
            | 'statusApproved'
            | 'statusRejected'
            | 'statusAccounted'
            | 'statusCancelled'
            | 'outline' = 'outline';
          let label = status;
          let className = '';

          switch (status) {
            case 'pending':
              variant = 'statusPending';
              label = dict.status.pending;
              break;
            case 'approved':
              variant = 'statusApproved';
              label = dict.status.approved;
              break;
            case 'rejected':
              variant = 'statusRejected';
              label = dict.status.rejected;
              break;
            case 'accounted':
              variant = 'statusAccounted';
              label = dict.status.accounted;
              break;
            case 'cancelled':
              variant = 'statusCancelled';
              label = dict.status.cancelled;
              break;
          }

          return (
            <Badge variant={variant} className={`text-nowrap ${className}`}>
              {label}
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        header: dict.columns.actions,
        cell: ({ row }) => {
          const submission = row.original;
          const status = submission.status;
          const isSupervisor = submission.supervisor === userEmail;
          const isAuthor = submission.submittedBy === userEmail;

          // Determine available actions based on status and role
          const canApprove = status === 'pending' && (isSupervisor || isAdmin);
          const canReject = status === 'pending' && (isSupervisor || isAdmin);
          const canMarkAccounted = status === 'approved' && (isHR || isAdmin);
          const canCorrect =
            (isAuthor && status === 'pending') ||
            (isHR && ['pending', 'approved'].includes(status)) ||
            (isAdmin && status !== 'accounted');

          // Build detail URL with returnUrl param if available
          const detailUrl = returnUrl
            ? `/overtime-submissions/${submission._id}?returnUrl=${encodeURIComponent(returnUrl)}`
            : `/overtime-submissions/${submission._id}`;

          // Build correction URL with returnUrl param if available
          const correctionUrl = returnUrl
            ? `/overtime-submissions/correct-overtime/${submission._id}?from=table&returnUrl=${encodeURIComponent(returnUrl)}`
            : `/overtime-submissions/correct-overtime/${submission._id}?from=table`;

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
                    {dict.actions.viewDetails}
                  </DropdownMenuItem>
                </LocalizedLink>

                {canCorrect && (
                  <LocalizedLink href={correctionUrl}>
                    <DropdownMenuItem>
                      <Edit2 />
                      {dict.actions.correct}
                    </DropdownMenuItem>
                  </LocalizedLink>
                )}

                {(canApprove || canReject || canMarkAccounted) && (
                  <DropdownMenuSeparator />
                )}

                {canApprove && (
                  <DropdownMenuItem
                    onSelect={() => openDialogForSubmission('approve', submission._id)}
                  >
                    <Check />
                    {dict.actions.approve}
                  </DropdownMenuItem>
                )}

                {canReject && (
                  <DropdownMenuItem
                    onSelect={() => openDialogForSubmission('reject', submission._id)}
                    className='text-destructive focus:text-destructive focus:bg-destructive/10'
                  >
                    <X />
                    {dict.actions.reject}
                  </DropdownMenuItem>
                )}

                {canMarkAccounted && (
                  <DropdownMenuItem
                    onSelect={() => openDialogForSubmission('markAccounted', submission._id)}
                  >
                    <Calendar />
                    {dict.actions.markAsAccounted}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
      {
        accessorKey: 'date',
        header: dict.columns.date,
        cell: ({ row }) => {
          const date = row.getValue('date') as string;
          return <span>{formatDateWithDay(date, lang)}</span>;
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
    ],
    [dict, userEmail, isAdmin, isHR, isPlantManager, openDialogForSubmission, showEmployeeColumn, showSupervisorColumn, returnUrl],
  );

  const table = useReactTable({
    data: submissions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 100,
      },
    },
  });

  return (
    <>
      <CardContent className='space-y-4'>
        {/* Bulk Actions */}
        <BulkActions table={table as any} session={session} dict={dict} />

        {/* Table */}
        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className='h-24 text-center'>
                    {dict.allEntriesPage?.noData || 'No data'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {table.getFilteredRowModel().rows.length > 100 && (
        <CardFooter className='flex justify-end'>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ArrowRight className='rotate-180 transform' />
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ArrowRight />
            </Button>
          </div>
        </CardFooter>
      )}

      {/* Dialogs */}
      {selectedSubmissionId && (
        <>
          <ApproveSubmissionDialog
            isOpen={openDialog === 'approve'}
            onOpenChange={(open) => !open && closeDialog()}
            submissionId={selectedSubmissionId}
            session={session}
            dict={dict}
          />
          <RejectSubmissionDialog
            isOpen={openDialog === 'reject'}
            onOpenChange={(open) => !open && closeDialog()}
            submissionId={selectedSubmissionId}
            session={session}
            dict={dict}
          />
          <MarkAsAccountedDialog
            isOpen={openDialog === 'markAccounted'}
            onOpenChange={(open) => !open && closeDialog()}
            submissionId={selectedSubmissionId}
            session={session}
            dict={dict}
          />
        </>
      )}
    </>
  );
}
