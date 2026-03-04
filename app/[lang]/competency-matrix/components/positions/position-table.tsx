'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MoreHorizontal } from 'lucide-react';
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
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
  DropdownMenuSeparator,
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

type PositionRow = PositionType & { employeeCount?: number };

interface PositionTableProps {
  data: PositionRow[];
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const columns: ColumnDef<PositionRow>[] = [
    {
      accessorKey: 'name',
      header: dict.competencies.name,
      cell: ({ row }) => (
        <Link
          href={`/${lang}/competency-matrix/positions/${row.original._id}`}
          className="font-medium hover:underline"
        >
          {localize(row.original.name, safeLang)}
        </Link>
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
              row: { original: PositionRow };
            }) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/${lang}/competency-matrix/positions/${row.original._id}/edit`}
                    >
                      {dict.edit}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
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
          } satisfies ColumnDef<PositionRow>,
        ]
      : []),
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
      id: 'certificationCount',
      header: dict.positions.requiredCertifications,
      cell: ({ row }) => row.original.requiredCertifications?.length ?? 0,
    },
    {
      accessorKey: 'employeeCount',
      header: dict.positions.employeeCount,
      cell: ({ row }) => row.original.employeeCount ?? '-',
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
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
