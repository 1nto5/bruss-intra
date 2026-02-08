'use client';

import LocalizedLink from '@/components/localized-link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Session } from 'next-auth';
import { Dictionary } from '../../lib/dict';
import { ManagedEmployee } from '../../lib/types';

export const createColumns = (
  session: Session | null,
  dict: Dictionary,
): ColumnDef<ManagedEmployee>[] => {
  return [
    {
      accessorKey: 'identifier',
      header: dict.columns.identifier,
    },
    {
      accessorKey: 'firstName',
      header: dict.columns.firstName,
    },
    {
      accessorKey: 'lastName',
      header: dict.columns.lastName,
    },
    {
      id: 'actions',
      header: dict.columns.actions,
      cell: ({ row, table }) => {
        const employee = row.original;
        const meta = table.options.meta as {
          onDeleteClick?: (id: string) => void;
        };

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' className='h-8 w-8 p-0'>
                <span className='sr-only'>Open menu</span>
                <MoreHorizontal className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='start'>
              <LocalizedLink
                href={`/employee-management/${employee._id}/edit`}
              >
                <DropdownMenuItem>
                  <Pencil />
                  {dict.actions.edit}
                </DropdownMenuItem>
              </LocalizedLink>
              {meta?.onDeleteClick && (
                <DropdownMenuItem
                  onClick={() => meta.onDeleteClick!(employee._id)}
                  className='text-destructive focus:text-destructive'
                >
                  <Trash2 />
                  {dict.actions.delete}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
};
