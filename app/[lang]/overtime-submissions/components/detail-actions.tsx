'use client';

import { Button } from '@/components/ui/button';
import { Calendar, Check, X } from 'lucide-react';
import { Session } from 'next-auth';
import { useState } from 'react';
import ApproveSubmissionDialog from './approve-submission-dialog';
import MarkAsAccountedDialog from './mark-as-accounted-dialog';
import RejectSubmissionDialog from './reject-submission-dialog';
import { Dictionary } from '../lib/dict';

interface DetailActionsProps {
  submissionId: string;
  status: string;
  supervisor: string;
  session: Session | null;
  dict: Dictionary;
}

type DialogType = 'approve' | 'reject' | 'markAccounted' | null;

export default function DetailActions({
  submissionId,
  status,
  supervisor,
  session,
  dict,
}: DetailActionsProps) {
  const [openDialog, setOpenDialog] = useState<DialogType>(null);

  const userEmail = session?.user?.email ?? '';
  const userRoles = session?.user?.roles ?? [];
  const isAdmin = userRoles.includes('admin');
  const isHR = userRoles.includes('hr');
  const isSupervisor = supervisor === userEmail;

  // Permission logic - single-stage approval only
  const canApprove = status === 'pending' && (isSupervisor || isAdmin);
  const canReject = status === 'pending' && (isSupervisor || isAdmin);
  const canMarkAccounted = status === 'approved' && (isHR || isAdmin);

  // No actions available
  if (!canApprove && !canReject && !canMarkAccounted) {
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
    </>
  );
}
