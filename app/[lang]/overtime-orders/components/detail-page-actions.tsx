'use client';

import { Button } from '@/components/ui/button';
import { Calendar, Check, RotateCcw, Trash2, X } from 'lucide-react';
import { Session } from 'next-auth';
import { ReactNode, useState } from 'react';
import ApproveRequestDialog from './approve-request-dialog';
import CancelRequestDialog from './cancel-request-dialog';
import DeleteRequestDialog from './delete-request-dialog';
import MarkAsAccountedDialog from './mark-as-accounted-dialog';
import PreApproveRequestDialog from './pre-approve-request-dialog';
import ReactivateRequestDialog from './reactivate-request-dialog';
import { Dictionary } from '../lib/dict';

interface DetailPageActionsProps {
  requestId: string;
  status: string;
  department?: string;
  requestedBy: string;
  responsibleEmployee: string;
  session: Session | null;
  dict: Dictionary;
  editSlot?: ReactNode;
  completeSlot?: ReactNode;
}

type DialogType =
  | 'preApprove'
  | 'approve'
  | 'markAccounted'
  | 'cancel'
  | 'delete'
  | 'reactivate'
  | null;

export default function DetailPageActions({
  requestId,
  status,
  department,
  requestedBy,
  responsibleEmployee,
  session,
  dict,
  editSlot,
  completeSlot,
}: DetailPageActionsProps) {
  const [openDialog, setOpenDialog] = useState<DialogType>(null);

  const userEmail = session?.user?.email ?? '';
  const userRoles = session?.user?.roles ?? [];
  const isAdmin = userRoles.includes('admin');
  const isHR = userRoles.includes('hr');
  const isPlantManager = userRoles.includes('plant-manager');
  const isProductionManager = userRoles.includes('production-manager');

  // Pre-approve: production-manager/admin for pending non-logistics orders
  const hasPreApproveAction =
    (isProductionManager || isAdmin) &&
    status === 'pending' &&
    department !== 'logistics';

  // Approve: plant-manager/admin for logistics pending OR non-logistics pre_approved
  const hasApproveAction =
    (isPlantManager || isAdmin) &&
    ((department === 'logistics' && status === 'pending') ||
      (department !== 'logistics' && status === 'pre_approved'));

  // Mark as accounted: HR/admin for completed orders
  const hasMarkAsAccountedAction =
    (isHR || isAdmin) && status === 'completed';

  // Cancel: non-terminal statuses, authorized roles or author
  const canCancel =
    status !== 'completed' &&
    status !== 'canceled' &&
    status !== 'accounted' &&
    (requestedBy === userEmail ||
      isPlantManager ||
      isAdmin ||
      userRoles.includes('group-leader') ||
      isProductionManager ||
      isHR);

  // Reactivate: admin/HR for canceled orders
  const canReactivate = (isAdmin || isHR) && status === 'canceled';

  // No actions available
  const hasAnyAction =
    hasPreApproveAction ||
    hasApproveAction ||
    hasMarkAsAccountedAction ||
    canCancel ||
    canReactivate ||
    isAdmin ||
    !!editSlot ||
    !!completeSlot;

  if (!hasAnyAction) {
    return null;
  }

  return (
    <>
      {hasPreApproveAction && (
        <Button
          variant='outline'
          className='w-full'
          onClick={() => setOpenDialog('preApprove')}
        >
          <Check className='h-4 w-4' />
          {dict.tableColumns.preApprove}
        </Button>
      )}

      {hasApproveAction && (
        <Button
          variant='outline'
          className='w-full'
          onClick={() => setOpenDialog('approve')}
        >
          <Check className='h-4 w-4' />
          {dict.tableColumns.approve}
        </Button>
      )}

      {editSlot}

      {hasMarkAsAccountedAction && (
        <Button
          variant='outline'
          className='w-full'
          onClick={() => setOpenDialog('markAccounted')}
        >
          <Calendar className='h-4 w-4' />
          {dict.tableColumns.markAsAccounted}
        </Button>
      )}

      {completeSlot}

      {canReactivate && (
        <Button
          variant='outline'
          className='w-full'
          onClick={() => setOpenDialog('reactivate')}
        >
          <RotateCcw className='h-4 w-4' />
          {dict.tableColumnsExtra.reactivateOrder}
        </Button>
      )}

      {canCancel && (
        <Button
          variant='outline'
          className='w-full text-destructive hover:text-destructive'
          onClick={() => setOpenDialog('cancel')}
        >
          <X className='h-4 w-4' />
          {dict.tableColumns.cancelRequest}
        </Button>
      )}

      {isAdmin && (
        <Button
          variant='outline'
          className='w-full text-destructive hover:text-destructive'
          onClick={() => setOpenDialog('delete')}
        >
          <Trash2 className='h-4 w-4' />
          {dict.tableColumnsExtra.deleteOrder}
        </Button>
      )}

      {/* Dialogs */}
      <PreApproveRequestDialog
        isOpen={openDialog === 'preApprove'}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        requestId={requestId}
        session={session}
        dict={dict}
      />

      <ApproveRequestDialog
        isOpen={openDialog === 'approve'}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        requestId={requestId}
        session={session}
        dict={dict}
      />

      <MarkAsAccountedDialog
        isOpen={openDialog === 'markAccounted'}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        requestId={requestId}
        session={session}
        dict={dict}
      />

      <CancelRequestDialog
        isOpen={openDialog === 'cancel'}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        requestId={requestId}
        dict={dict}
      />

      <DeleteRequestDialog
        isOpen={openDialog === 'delete'}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        requestId={requestId}
        dict={dict}
      />

      <ReactivateRequestDialog
        isOpen={openDialog === 'reactivate'}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        requestId={requestId}
        dict={dict}
      />
    </>
  );
}
