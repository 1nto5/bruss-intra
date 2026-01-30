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
import { Card, CardDescription, CardHeader } from '@/components/ui/card';
import { Table } from '@tanstack/react-table';
import { Check, X } from 'lucide-react';
import { Session } from 'next-auth';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  bulkApproveOrders,
  bulkCancelOrders,
  bulkMarkAsAccountedOrders,
} from '../actions/bulk';
import { Dictionary } from '../lib/dict';
import { IndividualOvertimeOrderType } from '../lib/types';

interface BulkActionsProps {
  table: Table<IndividualOvertimeOrderType>;
  session: Session | null;
  dict: Dictionary;
}

export default function BulkActions({
  table,
  session,
  dict,
}: BulkActionsProps) {
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<
    'approve' | 'cancel' | 'account' | null
  >(null);

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedCount = selectedRows.length;

  if (selectedCount === 0) {
    return null;
  }

  const userRoles = session?.user?.roles || [];
  const isAdmin = userRoles.includes('admin');
  const isPlantManager = userRoles.includes('plant-manager');
  const isHR = userRoles.includes('hr');
  const userEmail = session?.user?.email;

  // Check if user is a supervisor (leader or manager, but not plant-manager alone)
  const isSupervisor = userRoles.some(
    (r: string) => /leader|manager/i.test(r),
  );

  // Determine which actions are available for ALL selected items
  const canApprove = selectedRows.every((row) => {
    const order = row.original;
    const status = order.status;

    // Pending orders can be approved by supervisor (assigned or latest), HR, or Admin
    if (status === 'pending') {
      return (
        order.supervisor === userEmail ||
        isSupervisor ||
        isHR ||
        isAdmin
      );
    }

    // Pending-plant-manager orders can only be approved by plant manager or admin
    if (status === 'pending-plant-manager') {
      return isPlantManager || isAdmin;
    }

    return false;
  });

  const canCancel = selectedRows.every((row) => {
    const order = row.original;
    const status = order.status;

    // Can only cancel pending or pending-plant-manager orders
    if (status !== 'pending' && status !== 'pending-plant-manager') {
      return false;
    }

    // Check if user has permission to cancel
    return (
      order.createdBy === userEmail ||
      order.supervisor === userEmail ||
      isSupervisor ||
      isHR ||
      isAdmin ||
      isPlantManager
    );
  });

  const canMarkAsAccounted = selectedRows.every((row) => {
    const order = row.original;
    return (isHR || isAdmin) && order.status === 'approved';
  });

  const hasAnyAction = canApprove || canCancel || canMarkAsAccounted;

  // Helper function to get plural form based on count (Polish pluralization)
  const getPlural = (count: number) => {
    if (count === 1) return dict.bulkActions.plural.one;
    if (
      count % 10 >= 2 &&
      count % 10 <= 4 &&
      (count % 100 < 10 || count % 100 >= 20)
    ) {
      return dict.bulkActions.plural.few;
    }
    return dict.bulkActions.plural.many;
  };

  const handleAction = async (type: 'approve' | 'cancel' | 'account') => {
    const selectedIds = selectedRows.map((row) => row.original._id);

    let actionPromise;
    let successMessage;

    switch (type) {
      case 'approve':
        actionPromise = bulkApproveOrders(selectedIds);
        successMessage = dict.bulkActions.toast.approved;
        break;
      case 'cancel':
        actionPromise = bulkCancelOrders(selectedIds);
        successMessage = dict.bulkActions.toast.canceled;
        break;
      case 'account':
        actionPromise = bulkMarkAsAccountedOrders(selectedIds);
        successMessage = dict.bulkActions.toast.accounted;
        break;
    }

    toast.promise(actionPromise, {
      loading: dict.bulkActions.toast.processing,
      success: (result) => {
        if (result.error) {
          throw new Error(result.error);
        }
        table.resetRowSelection();
        return successMessage
          .replace('{count}', (result.count ?? 0).toString())
          .replace('{plural}', getPlural(result.count ?? 0));
      },
      error: (error) =>
        dict.bulkActions.toast.error.replace('{message}', error.message),
    });
  };

  const openConfirmDialog = (type: 'approve' | 'cancel' | 'account') => {
    setActionType(type);
    setIsAlertDialogOpen(true);
  };

  const handleConfirm = () => {
    if (actionType) {
      handleAction(actionType);
    }
    setIsAlertDialogOpen(false);
    setActionType(null);
  };

  const getDialogContent = () => {
    switch (actionType) {
      case 'approve':
        return {
          title: dict.bulkActions.confirmApprove.title,
          description: dict.bulkActions.confirmApprove.description
            .replace('{count}', selectedCount.toString())
            .replace('{plural}', getPlural(selectedCount)),
        };
      case 'cancel':
        return {
          title: dict.bulkActions.confirmCancel.title,
          description: dict.bulkActions.confirmCancel.description
            .replace('{count}', selectedCount.toString())
            .replace('{plural}', getPlural(selectedCount)),
        };
      case 'account':
        return {
          title: dict.bulkActions.confirmAccount.title,
          description: dict.bulkActions.confirmAccount.description
            .replace('{count}', selectedCount.toString())
            .replace('{plural}', getPlural(selectedCount)),
        };
      default:
        return { title: '', description: '' };
    }
  };

  return (
    <>
      <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getDialogContent().title}</AlertDialogTitle>
            <AlertDialogDescription>
              {getDialogContent().description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{dict.bulkActions.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {dict.bulkActions.common.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader className='p-4'>
          <CardDescription>
            {dict.bulkActions.selected
              .replace('{count}', selectedCount.toString())
              .replace('{plural}', getPlural(selectedCount))}
            {!hasAnyAction && (
              <>
                <br />
                <span className='text-muted-foreground'>
                  {dict.bulkActions.noCommonActions}
                </span>
              </>
            )}
          </CardDescription>
          {hasAnyAction && (
            <div className='flex flex-wrap gap-2'>
              {canApprove && (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => openConfirmDialog('approve')}
                >
                  <Check />
                  {dict.bulkActions.approve}
                </Button>
              )}
              {canCancel && (
                <Button
                  variant='destructive'
                  size='sm'
                  onClick={() => openConfirmDialog('cancel')}
                >
                  <X />
                  {dict.bulkActions.cancel}
                </Button>
              )}
              {canMarkAsAccounted && (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => openConfirmDialog('account')}
                >
                  <Check />
                  {dict.bulkActions.account}
                </Button>
              )}
            </div>
          )}
        </CardHeader>
      </Card>
    </>
  );
}
