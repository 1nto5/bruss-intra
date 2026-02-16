'use client';

import { Button } from '@/components/ui/button';
import { CardContent, CardFooter } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowRight, Bell, Eye, Mail, MoreHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { EmployeeBalanceType } from '@/app/api/overtime-submissions/balances/route';
import { Dictionary } from '../lib/dict';
import { Locale } from '@/lib/config/i18n';
import RemindEmployeeDialog from './remind-employee-dialog';
import NotifySupervisorDialog from './notify-supervisor-dialog';

type DialogType = 'remindEmployee' | 'notifySupervisor' | null;

interface BalancesTableProps {
  balances: EmployeeBalanceType[];
  dict: Dictionary;
  isAdmin: boolean;
  isHR: boolean;
  isPlantManager: boolean;
  lang: Locale;
  returnUrl?: string;
}

export default function BalancesTable({
  balances,
  dict,
  isAdmin,
  isHR,
  isPlantManager,
  lang,
  returnUrl,
}: BalancesTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = React.useState<SortingState>([]);

  // Dialog state
  const [openDialog, setOpenDialog] = React.useState<DialogType>(null);
  const [selectedBalance, setSelectedBalance] =
    React.useState<EmployeeBalanceType | null>(null);

  const openDialogForBalance = (
    type: DialogType,
    balance: EmployeeBalanceType,
  ) => {
    setSelectedBalance(balance);
    setOpenDialog(type);
  };

  const closeDialog = () => {
    setOpenDialog(null);
    setSelectedBalance(null);
  };

  const columns: ColumnDef<EmployeeBalanceType>[] = React.useMemo(
    () => [
      {
        accessorKey: 'name',
        header: dict.balancesPage?.employee || 'Employee',
        cell: ({ row }) => (
          <span className='font-medium'>{row.original.name}</span>
        ),
      },
      {
        accessorKey: 'latestSupervisorName',
        header: dict.balancesPage?.supervisor || 'Supervisor',
        cell: ({ row }) => <span>{row.original.latestSupervisorName}</span>,
      },
      {
        id: 'actions',
        header: dict.balancesPage?.actions || 'Actions',
        cell: ({ row }) => {
          const balance = row.original;

          const handleViewDetails = () => {
            const identifier = balance.userId || encodeURIComponent(balance.email);
            const url = returnUrl
              ? `/${lang}/overtime-submissions/balances/${identifier}?returnUrl=${encodeURIComponent(returnUrl)}`
              : `/${lang}/overtime-submissions/balances/${identifier}`;
            router.push(url);
          };

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' className='h-8 w-8 p-0'>
                  <span className='sr-only'>Open menu</span>
                  <MoreHorizontal className='h-4 w-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='start'>
                <DropdownMenuItem onSelect={handleViewDetails}>
                  <Eye />
                  {dict.balancesPage?.viewDetails || 'View details'}
                </DropdownMenuItem>
                {balance.allTimeBalance !== 0 && (
                  <DropdownMenuItem
                    onSelect={() =>
                      openDialogForBalance('remindEmployee', balance)
                    }
                  >
                    <Bell />
                    {dict.balancesPage?.remindEmployee || 'Remind employee'}
                  </DropdownMenuItem>
                )}
                {balance.allTimeBalance !== 0 && (isAdmin || isHR || isPlantManager) && (
                  <DropdownMenuItem
                    onSelect={() =>
                      openDialogForBalance('notifySupervisor', balance)
                    }
                  >
                    <Mail />
                    {dict.balancesPage?.notifySupervisor || 'Notify supervisor'}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
      {
        accessorKey: 'allTimeBalance',
        header: dict.balancesPage?.allTimeBalance || 'Balance',
        cell: ({ row }) => {
          const allTime = row.original.allTimeBalance;
          const allTimePending = row.original.allTimePendingHours;
          const period = row.original.periodHours;
          const periodPending = row.original.pendingHours;
          return (
            <div className='flex flex-col'>
              <span
                className={`font-semibold ${allTime !== 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}
              >
                {allTime > 0 ? '+' : ''}
                {allTime}h
                {allTimePending !== 0 && (
                  <span className='ml-1 font-normal text-yellow-600 dark:text-yellow-400'>
                    ({allTimePending > 0 ? '+' : ''}{allTimePending}h {dict.balancesPage?.pendingCount?.toLowerCase() || 'pending'})
                  </span>
                )}
              </span>
              {period !== allTime && (
                <span className='text-xs text-muted-foreground'>
                  ({dict.balancesPage?.periodHours || 'period'}: {period > 0 ? '+' : ''}{period}h
                  {periodPending !== 0 && (
                    <span className='text-yellow-600 dark:text-yellow-400'>
                      {' '}{periodPending > 0 ? '+' : ''}{periodPending}h {dict.balancesPage?.pendingCount?.toLowerCase() || 'pending'}
                    </span>
                  )}
                  )
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'pendingCount',
        header: dict.balancesPage?.pendingCount || 'Pending',
        cell: ({ row }) => {
          const count = row.original.pendingCount;
          return count > 0 ? (
            <span className='text-yellow-600 dark:text-yellow-400'>{count}</span>
          ) : (
            <span className='text-muted-foreground'>0</span>
          );
        },
      },
    ],
    [dict, isAdmin, isHR, isPlantManager, lang, router, returnUrl],
  );

  const table = useReactTable({
    data: balances,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
    initialState: {
      pagination: {
        pageSize: 100,
      },
    },
  });

  return (
    <>
      <CardContent>
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
                  <TableRow key={row.id}>
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
                  <TableCell
                    colSpan={columns.length}
                    className='h-24 text-center'
                  >
                    {dict.balancesPage?.noData || 'No data'}
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
      {selectedBalance && (
        <>
          <RemindEmployeeDialog
            isOpen={openDialog === 'remindEmployee'}
            onOpenChange={(open) => !open && closeDialog()}
            employeeEmail={selectedBalance.email}
            employeeName={selectedBalance.name}
            totalHours={selectedBalance.allTimeBalance}
            dict={dict}
          />
          <NotifySupervisorDialog
            isOpen={openDialog === 'notifySupervisor'}
            onOpenChange={(open) => !open && closeDialog()}
            supervisorEmail={selectedBalance.latestSupervisor}
            supervisorName={selectedBalance.latestSupervisorName}
            employeeEmail={selectedBalance.email}
            employeeUserId={selectedBalance.userId || encodeURIComponent(selectedBalance.email)}
            employeeName={selectedBalance.name}
            totalHours={selectedBalance.allTimeBalance}
            dict={dict}
          />
        </>
      )}
    </>
  );
}
