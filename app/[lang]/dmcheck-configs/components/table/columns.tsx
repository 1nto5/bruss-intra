'use client';

import LocalizedLink from '@/components/localized-link';
import { Badge } from '@/components/ui/badge';
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
import { DmcheckConfigFull } from '../../lib/types';

export function createColumns(
  session: Session | null,
  dict: Dictionary,
): ColumnDef<DmcheckConfigFull>[] {
  return [
    {
      accessorKey: 'workplace',
      header: dict.columns.workplace,
      cell: ({ row }) => {
        const workplace = row.getValue('workplace') as string;
        return <span>{workplace.toUpperCase()}</span>;
      },
    },
    {
      accessorKey: 'articleNumber',
      header: dict.columns.articleNumber,
    },
    {
      id: 'actions',
      header: dict.columns.actions,
      cell: ({ row, table }) => {
        const config = row.original;
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
              <LocalizedLink href={`/dmcheck-configs/${config._id}/edit`}>
                <DropdownMenuItem>
                  <Pencil />
                  {dict.actions.edit}
                </DropdownMenuItem>
              </LocalizedLink>
              {meta?.onDeleteClick && (
                <DropdownMenuItem
                  onClick={() => meta.onDeleteClick!(config._id)}
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
    {
      accessorKey: 'articleName',
      header: dict.columns.articleName,
      cell: ({ row }) => {
        const name = row.getValue('articleName') as string;
        const truncated =
          name.length > 40 ? `${name.substring(0, 40)}...` : name;
        return <span>{truncated}</span>;
      },
    },
    {
      accessorKey: 'piecesPerBox',
      header: dict.columns.piecesPerBox,
    },
    {
      id: 'flags',
      header: '',
      cell: ({ row }) => {
        const config = row.original;
        return (
          <div className='flex gap-1'>
            {config.ford && <Badge variant='outline'>Ford</Badge>}
            {config.bmw && <Badge variant='outline'>BMW</Badge>}
          </div>
        );
      },
    },
  ];
}
