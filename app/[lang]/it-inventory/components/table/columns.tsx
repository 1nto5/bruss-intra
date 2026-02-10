'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate } from '@/lib/utils/date-format';
import { ColumnDef } from '@tanstack/react-table';
import {
  ArrowUpDown,
  Edit,
  Eye,
  MoreHorizontal,
  Trash2,
  UserPlus,
  UserMinus,
} from 'lucide-react';
import { Session } from 'next-auth';
import { useState } from 'react';
import LocalizedLink from '@/components/localized-link';
import { Dictionary } from '../../lib/dict';
import { ITInventoryItem } from '../../lib/types';
import DeleteItemDialog from '../dialogs/delete-item-dialog';

// Map IT inventory statuses to badge variants
function getStatusVariant(status: string): any {
  const statusMap: Record<string, string> = {
    'in-use': 'statusInUse',
    'in-stock': 'statusInStock',
    'damaged': 'statusDamaged',
    'to-dispose': 'statusToDispose',
    'disposed': 'statusDisposed',
    'to-review': 'statusToReview',
    'to-repair': 'statusToRepair',
  };

  return statusMap[status] || 'secondary';
}

export const createColumns = (
  session: Session | null,
  dict: Dictionary,
  lang?: string,
): ColumnDef<ITInventoryItem>[] => {
  // Check if user has IT/Admin role
  const hasITRole = session?.user?.roles?.includes('it');
  const hasAdminRole = session?.user?.roles?.includes('admin');
  const canManage = hasITRole || hasAdminRole;

  return [
    {
      id: 'select',
      header: ({ table }) => (
        <div className="flex h-full items-center justify-center">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
            disabled={!canManage}
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex h-full items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            disabled={!canManage}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'assetId',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          {dict.table.columns.assetId}
          <ArrowUpDown />
        </Button>
      ),
      cell: ({ row }) => {
        const assetId = row.getValue('assetId') as string;
        const id = row.original._id;
        return (
          <LocalizedLink
            href={`/it-inventory/${id}`}
            className="font-medium hover:underline whitespace-nowrap"
          >
            {assetId}
          </LocalizedLink>
        );
      },
      enableSorting: true,
    },
    {
      id: 'actions',
      header: dict.table.columns.actions,
      cell: ({ row }) => {
        const item = row.original;
        const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

        return (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <LocalizedLink href={`/it-inventory/${item._id}`}>
                  <DropdownMenuItem>
                    <Eye />
                    {dict.common.details}
                  </DropdownMenuItem>
                </LocalizedLink>

                {canManage && (
                  <>
                    <DropdownMenuSeparator />
                    <LocalizedLink href={`/it-inventory/${item._id}/edit`}>
                      <DropdownMenuItem>
                        <Edit />
                        {dict.common.edit}
                      </DropdownMenuItem>
                    </LocalizedLink>

                    {item.currentAssignment ? (
                      <LocalizedLink href={`/it-inventory/${item._id}/unassign`}>
                        <DropdownMenuItem>
                          <UserMinus />
                          {dict.common.unassign}
                        </DropdownMenuItem>
                      </LocalizedLink>
                    ) : (
                      <LocalizedLink href={`/it-inventory/${item._id}/assign`}>
                        <DropdownMenuItem>
                          <UserPlus />
                          {dict.common.assign}
                        </DropdownMenuItem>
                      </LocalizedLink>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setIsDeleteDialogOpen(true)}
                      className="text-destructive"
                    >
                      <Trash2 />
                      {dict.common.delete}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {canManage && (
              <DeleteItemDialog
                item={item}
                dict={dict}
                lang={lang || 'pl'}
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
              />
            )}
          </>
        );
      },
    },
    {
      accessorKey: 'category',
      header: dict.table.columns.category,
      cell: ({ row }) => {
        const category = row.getValue('category') as keyof typeof dict.categories;
        return (
          <Badge variant="outline">
            {dict.categories[category]}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'manufacturer',
      header: dict.table.columns.manufacturer,
      cell: ({ row }) => {
        const manufacturer = row.getValue('manufacturer') as string;
        const model = row.original.model;
        return (
          <div>
            <div className="font-medium">{manufacturer}</div>
            <div className="text-sm text-muted-foreground">{model}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'serialNumber',
      header: dict.table.columns.serialNumber,
      cell: ({ row }) => {
        const serialNumber = row.getValue('serialNumber') as string;
        return <div className="font-mono text-sm">{serialNumber}</div>;
      },
    },
    {
      accessorKey: 'ipAddress',
      header: dict.table.columns.ipAddress,
      cell: ({ row }) => {
        const ipAddress = row.original.ipAddress;
        if (!ipAddress) return <div className="text-muted-foreground">—</div>;
        return <div className="font-mono text-sm">{ipAddress}</div>;
      },
    },
    {
      accessorKey: 'notes',
      header: dict.table.columns.notes,
      cell: ({ row }) => {
        const notes = row.original.notes;
        if (!notes) return <div className="text-muted-foreground">—</div>;
        return (
          <div className="max-w-[200px] truncate text-sm" title={notes}>
            {notes}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'statuses',
      header: dict.table.columns.statuses,
      cell: ({ row }) => {
        const statuses = row.getValue('statuses') as string[];
        return (
          <div className="flex flex-wrap gap-1">
            {statuses.slice(0, 2).map((status) => (
              <Badge key={status} variant={getStatusVariant(status) as any} className="text-xs">
                {dict.statuses[status as keyof typeof dict.statuses]}
              </Badge>
            ))}
            {statuses.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{statuses.length - 2}
              </Badge>
            )}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'currentAssignment',
      header: dict.table.columns.currentAssignment,
      cell: ({ row }) => {
        const assignment = row.original.currentAssignment;
        if (!assignment) {
          return <div className="text-muted-foreground text-sm">{dict.details.unassigned}</div>;
        }
        return (
          <div className="text-sm">
            {assignment.assignment.type === 'employee' ? (
              <>
                {assignment.assignment.employee.firstName} {assignment.assignment.employee.lastName}
                <div className="text-xs text-muted-foreground">
                  ({assignment.assignment.employee.identifier})
                </div>
              </>
            ) : (
              assignment.assignment.customName
            )}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'purchaseDate',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          {dict.table.columns.purchaseDate}
          <ArrowUpDown />
        </Button>
      ),
      cell: ({ row }) => {
        const date = row.getValue('purchaseDate') as Date;
        return <div className="text-sm">{formatDate(date)}</div>;
      },
      enableSorting: true,
    },
    {
      accessorKey: 'lastReview',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          {dict.table.columns.lastReview}
          <ArrowUpDown />
        </Button>
      ),
      cell: ({ row }) => {
        const date = row.getValue('lastReview') as Date | undefined;
        if (!date) return <div className="text-sm text-muted-foreground">—</div>;
        return <div className="text-sm">{formatDate(date)}</div>;
      },
      enableSorting: true,
    },
  ];
};
