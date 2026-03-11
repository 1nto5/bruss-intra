"use client";

import { Button } from "@/components/ui/button";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { AlarmClockPlus, ArrowRight, CircleX } from "lucide-react";
import * as React from "react";
import LocalizedLink from "@/components/localized-link";
import { Dictionary } from "../../lib/dict";
import { getColumns } from "./columns";

interface DataTableProps<TData, TValue> {
  data: TData[];
  id: string;
  status?: string;
  dict: Dictionary;
}

export function DataTable<TData, TValue>({
  data,
  id,
  status,
  dict,
}: DataTableProps<TData, TValue>) {
  const columns = getColumns(dict) as ColumnDef<TData, TValue>[];

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );

  const shouldShowActions =
    status &&
    status !== "closed" &&
    status !== "draft" &&
    status !== "rejected" &&
    status !== "canceled" &&
    status !== "completed" &&
    status !== "accounted";

  // Filter out the actions column if status doesn't allow it
  const filteredColumns = React.useMemo(() => {
    if (shouldShowActions) {
      return columns;
    }
    return columns.filter((column) => column.id !== "actions");
  }, [columns, shouldShowActions]);

  const table = useReactTable({
    data,
    columns: filteredColumns,
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

  const clearFilters = () => {
    setColumnFilters([]);
  };

  const firstNameFilter =
    (table.getColumn("firstName")?.getFilterValue() as string) || "";
  const lastNameFilter =
    (table.getColumn("lastName")?.getFilterValue() as string) || "";
  const identifierFilter =
    (table.getColumn("identifier")?.getFilterValue() as string) || "";
  const hasActiveFilters =
    firstNameFilter || lastNameFilter || identifierFilter;

  return (
    <>
      <CardContent>
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:flex lg:flex-wrap">
          <div className="flex flex-col space-y-1 lg:w-auto lg:flex-1 lg:min-w-[150px]">
            <Input
              placeholder={dict.idTable.firstName.toLowerCase()}
              value={firstNameFilter}
              onChange={(event) =>
                table.getColumn("firstName")?.setFilterValue(event.target.value)
              }
              className="w-full"
            />
          </div>
          <div className="flex flex-col space-y-1 lg:w-auto lg:flex-1 lg:min-w-[150px]">
            <Input
              placeholder={dict.idTable.lastName.toLowerCase()}
              value={lastNameFilter}
              onChange={(event) =>
                table.getColumn("lastName")?.setFilterValue(event.target.value)
              }
              className="w-full"
            />
          </div>
          <div className="flex flex-col space-y-1 lg:w-auto lg:flex-1 lg:min-w-[150px]">
            <Input
              placeholder={dict.idTable.identifier.toLowerCase()}
              value={identifierFilter}
              onChange={(event) =>
                table
                  .getColumn("identifier")
                  ?.setFilterValue(event.target.value)
              }
              className="w-full"
            />
          </div>
          <Button
            variant="destructive"
            title="Clear filters"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            className="flex-1 sm:flex-none"
          >
            <CircleX /> <span>{dict.common.clear}</span>
          </Button>
        </div>

        <div className="rounded-md border">
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
                    data-state={row.getIsSelected() && "selected"}
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
                    className="h-24 text-center"
                  >
                    {dict.idTable.noResults}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <ArrowRight className="rotate-180 transform" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          <ArrowRight />
        </Button>
      </CardFooter>
    </>
  );
}
