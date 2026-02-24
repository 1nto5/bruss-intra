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

import { Badge } from '@/components/ui/badge';
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

import type { ConfigValue } from '../../lib/types';
import { localize } from '../../lib/types';
import { deleteCertificationType } from '../../actions/cert-types';
import type { Dictionary } from '../../lib/dict';
import type { Locale } from '@/lib/config/i18n';

interface CertTypesTableProps {
  certTypes: ConfigValue[];
  dict: Dictionary;
  lang: Locale;
}

export function CertTypesTable({
  certTypes,
  dict,
  lang,
}: CertTypesTableProps) {
  const router = useRouter();
  const safeLang = (['pl', 'de', 'en'].includes(lang) ? lang : 'pl') as
    | 'pl'
    | 'de'
    | 'en';
  const [sorting, setSorting] = useState<SortingState>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const columns: ColumnDef<ConfigValue>[] = [
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
    {
      accessorKey: 'name',
      header: dict.competencies.name,
      cell: ({ row }) => localize(row.original.name, safeLang),
    },
    {
      id: 'actions',
      header: dict.actions,
      cell: ({ row }) => (
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
                href={`/${lang}/competency-matrix/settings/cert-types/${row.original.slug}/edit`}
              >
                {dict.edit}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                setSelectedSlug(row.original.slug);
                setDeleteDialogOpen(true);
              }}
            >
              {dict.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const table = useReactTable({
    data: certTypes,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
  });

  async function handleDelete() {
    if (!selectedSlug) return;
    const res = await deleteCertificationType(selectedSlug);
    if ('error' in res) {
      toast.error(dict.errors.serverError);
    } else {
      toast.success(dict.settings.certTypeDeleted);
      router.refresh();
    }
    setDeleteDialogOpen(false);
    setSelectedSlug(null);
  }

  return (
    <>
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dict.settings.deleteCertTypeConfirm}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dict.settings.deleteCertTypeConfirm}
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
