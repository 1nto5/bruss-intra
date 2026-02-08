'use client';

import { Button } from '@/components/ui/button';
import { CardContent, CardFooter } from '@/components/ui/card';
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
  SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowRight } from 'lucide-react';
import { Session } from 'next-auth';
import * as React from 'react';
import { Dictionary } from '../../lib/dict';
import DeleteConfigDialog from '../delete-config-dialog';

interface DataTableProps<TData, TValue> {
  columns: (
    session: Session | null,
    dict: Dictionary,
  ) => ColumnDef<TData, TValue>[];
  data: TData[];
  fetchTime: Date;
  session: Session | null;
  dict: Dictionary;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  fetchTime,
  session,
  dict,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedConfigId, setSelectedConfigId] = React.useState<string | null>(
    null,
  );

  const handleDeleteClick = React.useCallback((id: string) => {
    setSelectedConfigId(id);
    setDeleteDialogOpen(true);
  }, []);

  // Reset state when fetchTime changes (after search/filter)
  React.useEffect(() => {
    setSorting([]);
  }, [fetchTime]);

  const tableColumns = React.useMemo(
    () => columns(session, dict),
    [columns, session, dict],
  );

  const table = useReactTable<TData>({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
    initialState: { pagination: { pageSize: 100 } },
    meta: { onDeleteClick: handleDeleteClick } as Record<string, unknown>,
  });

  return (
    <>
      <CardContent className='space-y-4'>
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

      {selectedConfigId && (
        <DeleteConfigDialog
          isOpen={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          configId={selectedConfigId}
          dict={dict}
        />
      )}
    </>
  );
}
