'use client';

import LocalizedLink from '@/components/localized-link';
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
import { UsersListType } from '@/lib/types/user';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import {
  ArrowRight,
  Bell,
  Eye,
  Mail,
  MoreHorizontal,
} from 'lucide-react';
import { Session } from 'next-auth';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { EmployeeBalanceType } from '@/app/api/overtime-submissions/balances/route';
import { Dictionary } from '../lib/dict';
import { Locale } from '@/lib/config/i18n';
import { MultiSelect } from '@/components/ui/multi-select';
import { extractNameFromEmail } from '@/lib/utils/name-format';
import RemindEmployeeDialog from './remind-employee-dialog';
import NotifySupervisorDialog from './notify-supervisor-dialog';

type DialogType = 'remindEmployee' | 'notifySupervisor' | null;

interface BalancesTableProps {
  balances: EmployeeBalanceType[];
  dict: Dictionary;
  session: Session;
  users: UsersListType;
  supervisorEmails: string[];
  isAdmin: boolean;
  isHR: boolean;
  isPlantManager: boolean;
  lang: Locale;
}

export default function BalancesTable({
  balances,
  dict,
  session,
  users,
  supervisorEmails,
  isAdmin,
  isHR,
  isPlantManager,
  lang,
}: BalancesTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sorting, setSorting] = React.useState<SortingState>([]);

  // Dialog state
  const [openDialog, setOpenDialog] = React.useState<DialogType>(null);
  const [selectedBalance, setSelectedBalance] = React.useState<EmployeeBalanceType | null>(null);

  const openDialogForBalance = (type: DialogType, balance: EmployeeBalanceType) => {
    setSelectedBalance(balance);
    setOpenDialog(type);
  };

  const closeDialog = () => {
    setOpenDialog(null);
    setSelectedBalance(null);
  };

  // Filter states
  const [selectedEmployees, setSelectedEmployees] = React.useState<string[]>(
    searchParams.get('employee')?.split(',').filter(Boolean) || [],
  );
  const [selectedSupervisors, setSelectedSupervisors] = React.useState<string[]>(
    searchParams.get('supervisor')?.split(',').filter(Boolean) || [],
  );
  const [selectedYears, setSelectedYears] = React.useState<string[]>(
    searchParams.get('year')?.split(',').filter(Boolean) || [],
  );
  const [selectedMonths, setSelectedMonths] = React.useState<string[]>(
    searchParams.get('month')?.split(',').filter(Boolean) || [],
  );
  const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>(
    searchParams.get('status')?.split(',').filter(Boolean) || [],
  );

  // Update URL when filters change
  const updateFilters = React.useCallback(
    (key: string, values: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      if (values.length > 0) {
        params.set(key, values.join(','));
      } else {
        params.delete(key);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  // Create employee options from balances
  const employeeOptions = React.useMemo(
    () =>
      balances.map((b) => ({
        value: b.email,
        label: b.name,
      })),
    [balances],
  );

  // Create supervisor options
  const supervisorOptions = React.useMemo(
    () =>
      supervisorEmails.map((email) => ({
        value: email,
        label: extractNameFromEmail(email),
      })),
    [supervisorEmails],
  );

  // Year options (current year and previous 2 years)
  const yearOptions = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1, currentYear - 2].map((year) => ({
      value: year.toString(),
      label: year.toString(),
    }));
  }, []);

  // Month options
  const monthOptions = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    const months = [];
    for (let m = 1; m <= 12; m++) {
      const monthStr = m.toString().padStart(2, '0');
      const monthKey = monthStr as keyof typeof dict.months;
      months.push({
        value: `${currentYear}-${monthStr}`,
        label: `${dict.months[monthKey]} ${currentYear}`,
      });
    }
    return months;
  }, [dict.months]);

  // Status options
  const statusOptions = React.useMemo(
    () => [
      { value: 'pending', label: dict.status.pending },
      { value: 'pending-plant-manager', label: dict.status.pendingPlantManager },
      { value: 'approved', label: dict.status.approved },
      { value: 'rejected', label: dict.status.rejected },
      { value: 'accounted', label: dict.status.accounted },
      { value: 'cancelled', label: dict.status.cancelled },
    ],
    [dict.status],
  );

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
        accessorKey: 'totalHours',
        header: dict.balancesPage?.totalHours || 'Balance',
        cell: ({ row }) => {
          const hours = row.original.totalHours;
          return (
            <span
              className={`font-semibold ${hours < 0 ? 'text-red-600 dark:text-red-400' : hours > 0 ? 'text-green-600 dark:text-green-400' : ''}`}
            >
              {hours > 0 ? '+' : ''}
              {hours}h
            </span>
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
      {
        accessorKey: 'approvedCount',
        header: dict.balancesPage?.approvedCount || 'Approved',
        cell: ({ row }) => {
          const count = row.original.approvedCount;
          return count > 0 ? (
            <span className='text-green-600 dark:text-green-400'>{count}</span>
          ) : (
            <span className='text-muted-foreground'>0</span>
          );
        },
      },
      {
        accessorKey: 'entryCount',
        header: dict.balancesPage?.entryCount || 'Entries',
        cell: ({ row }) => <span>{row.original.entryCount}</span>,
      },
      {
        id: 'actions',
        header: dict.balancesPage?.actions || 'Actions',
        cell: ({ row }) => {
          const balance = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' className='h-8 w-8 p-0'>
                  <span className='sr-only'>Open menu</span>
                  <MoreHorizontal className='h-4 w-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <LocalizedLink
                  href={`/overtime-submissions/balances/${encodeURIComponent(balance.email)}`}
                >
                  <DropdownMenuItem>
                    <Eye className='mr-2 h-4 w-4' />
                    {dict.balancesPage?.viewDetails || 'View details'}
                  </DropdownMenuItem>
                </LocalizedLink>
                <DropdownMenuItem
                  onSelect={() => openDialogForBalance('remindEmployee', balance)}
                >
                  <Bell className='mr-2 h-4 w-4' />
                  {dict.balancesPage?.remindEmployee || 'Remind employee'}
                </DropdownMenuItem>
                {(isAdmin || isHR || isPlantManager) && (
                  <DropdownMenuItem
                    onSelect={() => openDialogForBalance('notifySupervisor', balance)}
                  >
                    <Mail className='mr-2 h-4 w-4' />
                    {dict.balancesPage?.notifySupervisor || 'Notify supervisor'}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [dict, isAdmin, isHR, isPlantManager, openDialogForBalance],
  );

  const table = useReactTable({
    data: balances,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
    },
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  return (
    <>
      <CardContent className='space-y-4'>
        {/* Filters */}
        <div className='flex flex-wrap gap-2'>
          <MultiSelect
            options={employeeOptions}
            value={selectedEmployees}
            onValueChange={(values) => {
              setSelectedEmployees(values);
              updateFilters('employee', values);
            }}
            placeholder={dict.balancesPage?.employee || 'Employee'}
            searchPlaceholder={dict.filters?.searchPlaceholder || 'search...'}
            emptyText={dict.filters?.notFound || 'not found'}
            className='w-[200px]'
          />

          {(isAdmin || isHR || isPlantManager) && (
            <MultiSelect
              options={supervisorOptions}
              value={selectedSupervisors}
              onValueChange={(values) => {
                setSelectedSupervisors(values);
                updateFilters('supervisor', values);
              }}
              placeholder={dict.balancesPage?.supervisor || 'Supervisor'}
              searchPlaceholder={dict.filters?.searchPlaceholder || 'search...'}
              emptyText={dict.filters?.notFound || 'not found'}
              className='w-[200px]'
            />
          )}

          <MultiSelect
            options={statusOptions}
            value={selectedStatuses}
            onValueChange={(values) => {
              setSelectedStatuses(values);
              updateFilters('status', values);
            }}
            placeholder={dict.filters?.status || 'Status'}
            searchPlaceholder={dict.filters?.searchPlaceholder || 'search...'}
            emptyText={dict.filters?.notFound || 'not found'}
            className='w-[200px]'
          />

          <MultiSelect
            options={yearOptions}
            value={selectedYears}
            onValueChange={(values) => {
              setSelectedYears(values);
              updateFilters('year', values);
            }}
            placeholder={dict.filters?.year || 'Year'}
            searchPlaceholder={dict.filters?.searchPlaceholder || 'search...'}
            emptyText={dict.filters?.notFound || 'not found'}
            className='w-[120px]'
          />

          <MultiSelect
            options={monthOptions}
            value={selectedMonths}
            onValueChange={(values) => {
              setSelectedMonths(values);
              updateFilters('month', values);
            }}
            placeholder={dict.filters?.month || 'Month'}
            searchPlaceholder={dict.filters?.searchPlaceholder || 'search...'}
            emptyText={dict.filters?.notFound || 'not found'}
            className='w-[180px]'
          />
        </div>

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
                  <TableCell colSpan={columns.length} className='h-24 text-center'>
                    {dict.balancesPage?.noData ||
                      'No employees with non-zero overtime balance'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <CardFooter className='flex justify-between'>
        <div className='text-muted-foreground flex-1 text-sm'>
          {table.getFilteredRowModel().rows.length}{' '}
          {dict.balancesPage?.employee?.toLowerCase() || 'employees'}
        </div>
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

      {/* Dialogs */}
      {selectedBalance && (
        <>
          <RemindEmployeeDialog
            isOpen={openDialog === 'remindEmployee'}
            onOpenChange={(open) => !open && closeDialog()}
            employeeEmail={selectedBalance.email}
            employeeName={selectedBalance.name}
            totalHours={selectedBalance.totalHours}
            dict={dict}
          />
          <NotifySupervisorDialog
            isOpen={openDialog === 'notifySupervisor'}
            onOpenChange={(open) => !open && closeDialog()}
            supervisorEmail={selectedBalance.latestSupervisor}
            supervisorName={selectedBalance.latestSupervisorName}
            employeeEmail={selectedBalance.email}
            employeeName={selectedBalance.name}
            totalHours={selectedBalance.totalHours}
            dict={dict}
          />
        </>
      )}
    </>
  );
}
