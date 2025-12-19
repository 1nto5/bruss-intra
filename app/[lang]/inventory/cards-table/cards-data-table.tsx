'use client';

import {
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import * as React from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { Button } from '@/components/ui/button';
import { CardContent, CardFooter } from '@/components/ui/card';

import { ArrowRight } from 'lucide-react';
import { createCardsColumns } from './cards-columns';
import { Dictionary } from '../lib/dict';
import { CardTableDataType, WarehouseConfigType } from '../lib/types';
import { SelectOption } from '@/lib/data/get-inventory-filter-options';
import CardsTableFilteringAndOptions from '../components/cards-table-filtering-and-options';
import { MobileCardCard } from '../components/mobile-card-card';

interface DataTableProps {
  data: CardTableDataType[];
  fetchTime: string;
  lang: string;
  dict: Dictionary;
  warehouseOptions: WarehouseConfigType[];
  sectorConfigsMap: Record<string, SelectOption[]>;
}

export function CardsDataTable({
  data,
  fetchTime,
  lang,
  dict,
  warehouseOptions,
  sectorConfigsMap,
}: DataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );

  const columns = React.useMemo(
    () => createCardsColumns(dict, warehouseOptions),
    [dict, warehouseOptions],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
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
        <CardsTableFilteringAndOptions
          setFilter={(columnId, value) =>
            table.getColumn(columnId)?.setFilterValue(value)
          }
          dict={dict}
          fetchTime={fetchTime}
          warehouseOptions={warehouseOptions}
          sectorConfigsMap={sectorConfigsMap}
        />

        {/* Mobile card view */}
        <div className='flex flex-col gap-3 sm:hidden'>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <MobileCardCard
                key={row.id}
                card={row.original}
                dict={dict}
                warehouseOptions={warehouseOptions}
              />
            ))
          ) : (
            <div className='py-12 text-center text-muted-foreground'>
              {dict.table.noResults}
            </div>
          )}
        </div>

        {/* Desktop table view */}
        <div className='hidden sm:block overflow-x-auto rounded-md border'>
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
                    colSpan={columns.length}
                    className='h-24 text-center'
                  >
                    {dict.table.noResults}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className='flex justify-between'>
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
      </CardFooter>
    </>
  );
}
