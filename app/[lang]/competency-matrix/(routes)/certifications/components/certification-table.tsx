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

import type { CertificationTableRow, ConfigValue, I18nString } from '../../../lib/types';
import { localize } from '../../../lib/types';
import { CertificationActions } from '../../../components/certifications/certification-actions';
import type { Dictionary } from '../../../lib/dict';
import type { Locale } from '@/lib/config/i18n';

interface CertificationTableProps {
  data: CertificationTableRow[];
  certTypes: ConfigValue[];
  dict: Dictionary;
  lang: Locale;
}

export function CertificationTable({
  data,
  certTypes,
  dict,
  lang,
}: CertificationTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const safeLang = (['pl', 'de', 'en'].includes(lang) ? lang : 'pl') as
    | 'pl'
    | 'de'
    | 'en';

  const certTypeMap = new Map<string, I18nString>(
    certTypes.map((ct) => [ct.slug, ct.name]),
  );

  const columns: ColumnDef<CertificationTableRow>[] = [
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
      accessorKey: 'employeeName',
      header: dict.employees.name,
    },
    {
      accessorKey: 'certificationType',
      header: dict.certifications.type,
      cell: ({ row }) => {
        const slug = row.original.certificationType;
        const name = certTypeMap.get(slug);
        return name ? localize(name, safeLang) : slug;
      },
    },
    {
      accessorKey: 'issuedDate',
      header: dict.certifications.issuedDate,
      cell: ({ row }) =>
        row.original.issuedDate
          ? new Date(row.original.issuedDate).toLocaleDateString()
          : '-',
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
      accessorKey: 'daysLeft',
      header: dict.certifications.daysLeft,
      cell: ({ row }) => {
        const { daysLeft, status } = row.original;
        if (status === 'no-expiration') return '-';
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
    {
      id: 'actions',
      header: dict.actions,
      cell: ({ row }) => (
        <CertificationActions
          certification={row.original}
          dict={dict}
          lang={lang}
        />
      ),
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
