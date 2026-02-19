'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
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
} from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import type { PositionType } from '../../lib/types';
import { localize } from '../../lib/types';
import type { Dictionary } from '../../lib/dict';
import type { Locale } from '@/lib/config/i18n';
import { deletePosition } from '../../actions/positions';

interface PositionTableProps {
  data: (PositionType & { employeeCount?: number })[];
  dict: Dictionary;
  lang: Locale;
  canEdit: boolean;
  canDelete: boolean;
}

export function PositionTable({
  data,
  dict,
  lang,
  canEdit,
  canDelete,
}: PositionTableProps) {
  const router = useRouter();
  const safeLang = (['pl', 'de', 'en'].includes(lang) ? lang : 'pl') as 'pl' | 'de' | 'en';
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const columns: ColumnDef<PositionType & { employeeCount?: number }>[] = [
    {
      accessorKey: 'name',
      header: dict.positions.name,
      cell: ({ row }) => (
        <Link
          href={`/${lang}/competency-matrix/positions/${row.original._id}`}
          className="font-medium hover:underline"
        >
          {localize(row.original.name, safeLang)}
        </Link>
      ),
      filterFn: (row, _, filterValue) => {
        const name = localize(row.original.name, safeLang);
        return name.toLowerCase().includes(filterValue.toLowerCase());
      },
    },
    {
      accessorKey: 'department',
      header: dict.positions.department,
    },
    {
      id: 'competencyCount',
      header: dict.positions.requiredCompetencies,
      cell: ({ row }) => row.original.requiredCompetencies?.length ?? 0,
    },
    {
      accessorKey: 'employeeCount',
      header: dict.positions.employeeCount,
      cell: ({ row }) => row.original.employeeCount ?? '-',
    },
    {
      accessorKey: 'active',
      header: dict.competencies.status,
      cell: ({ row }) =>
        row.original.active ? (
          <Badge variant="statusApproved">{dict.active}</Badge>
        ) : (
          <Badge variant="statusClosed">{dict.inactive}</Badge>
        ),
    },
    ...(canEdit
      ? [
          {
            id: 'actions',
            header: dict.actions,
            cell: ({
              row,
            }: {
              row: { original: PositionType & { employeeCount?: number } };
            }) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    ...
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/${lang}/competency-matrix/positions/${row.original._id}/edit`}
                    >
                      {dict.edit}
                    </Link>
                  </DropdownMenuItem>
                  {canDelete && (
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        setSelectedId(row.original._id!);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      {dict.delete}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          } satisfies ColumnDef<PositionType & { employeeCount?: number }>,
        ]
      : []),
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting, columnFilters },
    initialState: { pagination: { pageSize: 50 } },
  });

  async function handleDelete() {
    if (!selectedId) return;
    const res = await deletePosition(selectedId);
    if ('error' in res) {
      toast.error(dict.errors.serverError);
    } else {
      toast.success(dict.positions.deleted);
      router.refresh();
    }
    setDeleteDialogOpen(false);
    setSelectedId(null);
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4 py-4">
        <Input
          placeholder={dict.search}
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(e) =>
            table.getColumn('name')?.setFilterValue(e.target.value)
          }
          className="max-w-sm"
        />
        <span className="text-sm text-muted-foreground">
          {dict.positions.totalCount}: {data.length}
        </span>
      </div>

      <div className="rounded-md border">
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
                <TableCell colSpan={columns.length} className="text-center">
                  {dict.noData}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          &lt;
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          &gt;
        </Button>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dict.positions.deleteConfirm}</AlertDialogTitle>
            <AlertDialogDescription>
              {dict.positions.deleteWarning}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{dict.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {dict.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
