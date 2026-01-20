'use client';

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
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate } from '@/lib/utils/date-format';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { deleteDayOff } from '../../actions';
import { Dictionary } from '../../lib/dict';
import { overtimeRequestEmployeeType } from '../../lib/types';

const handleDeleteDayOff = async (
  overtimeId: string,
  employeeIdentifier: string,
  dict: Dictionary,
) => {
  toast.promise(
    deleteDayOff(overtimeId, employeeIdentifier).then((res) => {
      if (res && res.error) {
        throw new Error(res.error);
      }
      return res;
    }),
    {
      loading: dict.idTable.toast.deleting,
      success: dict.idTable.toast.deleted,
      error: (error) => {
        const errorMsg = error.message;
        if (errorMsg === 'unauthorized') return dict.idTable.toast.unauthorized;
        if (errorMsg === 'not found') return dict.idTable.toast.notFound;
        if (errorMsg === 'not found employee')
          return dict.idTable.toast.employeeNotFound;
        if (errorMsg === 'invalid status')
          return dict.idTable.toast.invalidStatus;
        console.error('handleDeleteDayOff', errorMsg);
        return dict.idTable.toast.contactIT;
      },
    },
  );
};

function DeleteDayOffDialog({
  isOpen,
  setIsOpen,
  overtimeId,
  firstName,
  lastName,
  identifier,
  dict,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  overtimeId: string;
  firstName: string;
  lastName: string;
  identifier: string;
  dict: Dictionary;
}) {
  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {dict.idTable.confirmDelete.title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {dict.idTable.confirmDelete.description
              .replace('{firstName}', firstName)
              .replace('{lastName}', lastName)
              .replace('{identifier}', identifier)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setIsOpen(false)}>
            {dict.common.cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setIsOpen(false);
              handleDeleteDayOff(overtimeId, identifier, dict);
            }}
          >
            {dict.common.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ActionsCell({ row, dict }: { row: any; dict: Dictionary }) {
  const [isDeleteOpen, setDeleteOpen] = useState<boolean>(false);

  // assume employee properties exist on row.original
  const { overtimeId, firstName, lastName, identifier } = row.original;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='h-8 w-8 p-0'>
            <MoreHorizontal className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start'>
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className='focus:bg-red-400 dark:focus:bg-red-700'
          >
            <Trash2 />
            <span>{dict.idTable.deleteDayOff}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Okno potwierdzenia usunięcia wniosku o urlop */}
      <DeleteDayOffDialog
        isOpen={isDeleteOpen}
        setIsOpen={setDeleteOpen}
        overtimeId={overtimeId}
        firstName={firstName}
        lastName={lastName}
        identifier={identifier}
        dict={dict}
      />
    </>
  );
}

export const getColumns = (
  dict: Dictionary,
): ColumnDef<overtimeRequestEmployeeType>[] => [
  {
    accessorKey: 'firstName',
    header: dict.idTable.firstName,
  },
  {
    accessorKey: 'lastName',
    header: dict.idTable.lastName,
  },
  {
    accessorKey: 'identifier',
    header: dict.idTable.identifier,
  },
  {
    id: 'actions',
    header: dict.idTable.actions,
    cell: ({ row }) => <ActionsCell row={row} dict={dict} />,
  },
  {
    accessorKey: 'agreedReceivingAt',
    header: dict.idTable.agreedReceivingAt,
    cell: ({ row }) => {
      const agreedReceivingAt = row.original.agreedReceivingAt;
      const formattedDate = formatDate(agreedReceivingAt);
      return <span>{formattedDate}</span>;
    },
  },
  {
    accessorKey: 'note',
    header: dict.idTable.note,
    cell: ({ getValue }) => {
      const note = getValue<string>();
      return <span>{note || '-'}</span>;
    },
  },
];
