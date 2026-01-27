'use client';

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
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { CardContent, CardFooter } from '@/components/ui/card';
import { Locale } from '@/lib/config/i18n';
import { ArrowRight } from 'lucide-react';
import { Session } from 'next-auth';
import BulkActions from '../bulk-actions';
import CancelSubmissionDialog from '../cancel-submission-dialog';
import { Dictionary } from '../../lib/dict';

// Add TableMeta type
interface TableMeta {
  session: Session | null;
}

interface DataTableProps<TData, TValue> {
  columns: (session: Session | null, dict: Dictionary, lang: Locale) => ColumnDef<TData, TValue>[];
  data: TData[];
  fetchTime: Date;
  session: Session | null;
  dict: Dictionary;
  lang: Locale;
  returnUrl?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  fetchTime,
  session,
  dict,
  lang,
  returnUrl,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = React.useState<
    string | null
  >(null);

  const handleCancelClick = React.useCallback((submissionId: string) => {
    setSelectedSubmissionId(submissionId);
    setCancelDialogOpen(true);
  }, []);

  // Reset row selection when fetchTime changes (after search/filter)
  React.useEffect(() => {
    setRowSelection({});
  }, [fetchTime]);

  // Use the session, dict and lang to create the columns
  const tableColumns = React.useMemo(
    () => columns(session, dict, lang),
    [columns, session, dict, lang],
  );

  const table = useReactTable<TData>({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 100,
      },
    },
    meta: { session, onCancelClick: handleCancelClick, returnUrl } as any,
  });

  return (
    <>
      <CardContent className='space-y-4'>
        {/* Bulk Actions */}
        <BulkActions table={table as any} session={session} dict={dict} />

        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    );
                  })}
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
                  <TableCell
                    colSpan={tableColumns.length}
                    className='h-24 text-center'
                  >
                    {dict.noData}
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

      {selectedSubmissionId && (
        <CancelSubmissionDialog
          isOpen={cancelDialogOpen}
          onOpenChange={setCancelDialogOpen}
          submissionId={selectedSubmissionId}
          dict={dict}
        />
      )}
    </>
  );
}
