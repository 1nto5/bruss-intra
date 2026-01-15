'use client';

import { Button } from '@/components/ui/button';
import { Calendar, Check, DollarSign, X } from 'lucide-react';
import { Session } from 'next-auth';
import { useState } from 'react';
import ApproveSubmissionDialog from './approve-submission-dialog';
import ConvertToPayoutDialog from './convert-to-payout-dialog';
import MarkAsAccountedDialog from './mark-as-accounted-dialog';
import RejectSubmissionDialog from './reject-submission-dialog';
import { Dictionary } from '../lib/dict';

interface DetailActionsProps {
  submissionId: string;
  status: string;
  supervisor: string;
  payment?: boolean;
  session: Session | null;
  dict: Dictionary;
}

type DialogType = 'approve' | 'reject' | 'markAccounted' | 'convertToPayout' | null;

export default function DetailActions({
  submissionId,
  status,
  supervisor,
  payment,
  session,
  dict,
}: DetailActionsProps) {
  const [openDialog, setOpenDialog] = useState<DialogType>(null);

  const userEmail = session?.user?.email ?? '';
  const userRoles = session?.user?.roles ?? [];
  const isAdmin = userRoles.includes('admin');
  const isHR = userRoles.includes('hr');
  const isPlantManager = userRoles.includes('plant-manager');
  const isSupervisor = supervisor === userEmail;

  // Permission logic (same as employee-submissions-table.tsx:227-235)
  const canApprove =
    (status === 'pending' && (isSupervisor || isAdmin)) ||
    (status === 'pending-plant-manager' && (isPlantManager || isAdmin));

  const canReject =
    (status === 'pending' && (isSupervisor || isAdmin)) ||
    (status === 'pending-plant-manager' && (isPlantManager || isAdmin));

  const canMarkAccounted = status === 'approved' && (isHR || isAdmin);

  const canConvertToPayout =
    status === 'approved' && (isPlantManager || isAdmin) && !payment;

  // No actions available
  if (!canApprove && !canReject && !canMarkAccounted && !canConvertToPayout) {
    return null;
  }

  return (
    <>
      {canApprove && (
        <Button
          variant='outline'
          className='w-full sm:w-auto'
          onClick={() => setOpenDialog('approve')}
        >
          <Check className='h-4 w-4' />
          {dict.actions.approve}
        </Button>
      )}

      {canReject && (
        <Button
          variant='outline'
          className='w-full text-destructive hover:text-destructive sm:w-auto'
          onClick={() => setOpenDialog('reject')}
        >
          <X className='h-4 w-4' />
          {dict.actions.reject}
        </Button>
      )}

      {canMarkAccounted && (
        <Button
          variant='outline'
          className='w-full sm:w-auto'
          onClick={() => setOpenDialog('markAccounted')}
        >
          <Calendar className='h-4 w-4' />
          {dict.actions.markAsAccounted}
        </Button>
      )}

      {canConvertToPayout && (
        <Button
          variant='outline'
          className='w-full sm:w-auto'
          onClick={() => setOpenDialog('convertToPayout')}
        >
          <DollarSign className='h-4 w-4' />
          {dict.actions.convertToPayout}
        </Button>
      )}

      {/* Dialogs */}
      <ApproveSubmissionDialog
        isOpen={openDialog === 'approve'}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        submissionId={submissionId}
        session={session}
        dict={dict}
      />

      <RejectSubmissionDialog
        isOpen={openDialog === 'reject'}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        submissionId={submissionId}
        session={session}
        dict={dict}
      />

      <MarkAsAccountedDialog
        isOpen={openDialog === 'markAccounted'}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        submissionId={submissionId}
        session={session}
        dict={dict}
      />

      <ConvertToPayoutDialog
        isOpen={openDialog === 'convertToPayout'}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        submissionId={submissionId}
        session={session}
        dict={dict}
      />
    </>
  );
}
