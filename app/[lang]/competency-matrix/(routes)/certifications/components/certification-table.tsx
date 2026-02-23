'use client';

import { useState } from 'react';
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { CertificationTableRow } from '../../../lib/types';
import { localize } from '../../../lib/types';
import { CERTIFICATION_TYPE_LABELS } from '../../../lib/constants';
import type { CertificationType } from '../../../lib/types';
import type { Dictionary } from '../../../lib/dict';
import type { Locale } from '@/lib/config/i18n';

interface CertificationTableProps {
  data: CertificationTableRow[];
  dict: Dictionary;
  lang: Locale;
}

export function CertificationTable({
  data,
  dict,
  lang,
}: CertificationTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const safeLang = (['pl', 'de', 'en'].includes(lang) ? lang : 'pl') as
    | 'pl'
    | 'de'
    | 'en';

  const columns: ColumnDef<CertificationTableRow>[] = [
    {
      accessorKey: 'employeeName',
      header: dict.employees.name,
    },
    {
      accessorKey: 'certificationType',
      header: dict.certifications.type,
      cell: ({ row }) => {
        const certType = row.original.certificationType as CertificationType;
        return (
          localize(CERTIFICATION_TYPE_LABELS[certType], safeLang) || certType
        );
      },
    },
    {
      accessorKey: 'issuedDate',
      header: dict.certifications.issuedDate,
      cell: ({ row }) =>
        row.original.issuedDate
          ? new Date(row.original.issuedDate).toLocaleDateString()
          : '—',
    },
    {
      accessorKey: 'expirationDate',
      header: dict.certifications.expirationDate,
      cell: ({ row }) =>
        row.original.expirationDate
          ? new Date(row.original.expirationDate).toLocaleDateString()
          : dict.certifications.noExpiration,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        switch (status) {
          case 'valid':
            return (
              <Badge variant="statusApproved">
                {dict.certifications.valid}
              </Badge>
            );
          case 'expiring':
            return (
              <Badge variant="statusOverdue">
                {dict.certifications.expiringSoon}
              </Badge>
            );
          case 'expired':
            return (
              <Badge variant="statusRejected">
                {dict.certifications.expired}
              </Badge>
            );
          case 'no-expiration':
            return (
              <Badge variant="statusClosed">
                {dict.certifications.noExpiration}
              </Badge>
            );
        }
      },
    },
    {
      accessorKey: 'daysLeft',
      header: dict.certifications.daysLeft,
      cell: ({ row }) => {
        const { daysLeft, status } = row.original;
        if (status === 'no-expiration') return '—';
        if (status === 'expired') {
          return (
            <span className="font-medium text-red-600">
              {dict.certifications.expired}
            </span>
          );
        }
        return (
          <span
            className={
              status === 'expiring'
                ? 'font-medium text-amber-600'
                : 'text-muted-foreground'
            }
          >
            {daysLeft}
          </span>
        );
      },
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

  return (
    <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={
                      header.column.getCanSort()
                        ? 'cursor-pointer select-none'
                        : ''
                    }
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                    {{
                      asc: ' ↑',
                      desc: ' ↓',
                    }[header.column.getIsSorted() as string] ?? null}
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
  );
}
