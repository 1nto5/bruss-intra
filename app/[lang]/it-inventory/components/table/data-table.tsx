"use client";

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
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CardContent } from "@/components/ui/card";
import * as React from "react";
import { Session } from "next-auth";
import { Dictionary } from "../../lib/dict";
import { ITInventoryItem } from "../../lib/types";
import BulkActions from "../bulk-actions";

interface DataTableProps<TData, TValue> {
  columns: (
    session: Session | null,
    dict: Dictionary,
    lang: string,
  ) => ColumnDef<TData, TValue>[];
  data: TData[];
  session: Session | null;
  dict: Dictionary;
  lang: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  session,
  dict,
  lang,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  // Create columns using useMemo
  const tableColumns = React.useMemo(
    () => columns(session, dict, lang),
    [columns, session, dict, lang],
  );

  // Check IT/Admin role for bulk actions
  const hasITRole = session?.user?.roles?.includes("it");
  const hasAdminRole = session?.user?.roles?.includes("admin");
  const canManage = hasITRole || hasAdminRole;

  const table = useReactTable({
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
        pageSize: 10000, // Show all data without pagination
      },
    },
  });

  // Reset row selection when data changes
  React.useEffect(() => {
    setRowSelection({});
  }, [data]);

  // Get selected items for bulk actions
  const selectedItems = table
    .getSelectedRowModel()
    .rows.map((row) => row.original as ITInventoryItem);

  return (
    <>
      <CardContent className="space-y-4">
        {/* Bulk Actions */}
        {canManage && selectedItems.length > 0 && (
          <BulkActions selectedItems={selectedItems} dict={dict} />
        )}

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
                    colSpan={tableColumns.length}
                    className="h-24 text-center"
                  >
                    {dict.table.noResults}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </>
  );
}
