'use client';

import { Button } from '@/components/ui/button';
import { Calendar, Check, X } from 'lucide-react';
import { Session } from 'next-auth';
import { ReactNode, useEffect, useState } from 'react';
import ApproveSubmissionDialog from './approve-submission-dialog';
import MarkAsAccountedDialog from './mark-as-accounted-dialog';
import RejectSubmissionDialog from './reject-submission-dialog';
import { Dictionary } from '../lib/dict';

interface SupervisorQuotaInfo {
  canGiveFinalApproval: boolean;
  monthlyLimit: number;
  usedHours: number;
  remainingHours: number;
  submissionHours: number;
}

interface DetailActionsProps {
  submissionId: string;
  status: string;
  supervisor: string;
  session: Session | null;
  dict: Dictionary;
  payoutRequest?: boolean;
  hours?: number;
  /** Content to render after Approve button (e.g., Correction button) */
  afterApproveSlot?: ReactNode;
}

type DialogType = 'approve' | 'reject' | 'markAccounted' | null;

export default function DetailActions({
  submissionId,
  status,
  supervisor,
  session,
  dict,
  payoutRequest,
  hours,
  afterApproveSlot,
}: DetailActionsProps) {
  const [openDialog, setOpenDialog] = useState<DialogType>(null);
  const [quotaInfo, setQuotaInfo] = useState<SupervisorQuotaInfo | null>(null);

  const userEmail = session?.user?.email ?? '';
  const userRoles = session?.user?.roles ?? [];
  const isAdmin = userRoles.includes('admin');
  const isHR = userRoles.includes('hr');
  const isPlantManager = userRoles.includes('plant-manager');
  const isSupervisor = supervisor === userEmail;

  // Fetch supervisor quota info for pending payout submissions
  useEffect(() => {
    if (status === 'pending' && payoutRequest) {
      fetch(`/api/overtime-submissions/supervisor-quota?submissionId=${submissionId}`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) {
            setQuotaInfo(data);
          }
        })
        .catch(console.error);
    }
  }, [submissionId, status, payoutRequest]);

  // Permission logic - dual-stage approval for payout requests
  // Pending: supervisor/admin can approve/reject
  // Pending-plant-manager: plant-manager/admin can approve/reject
  const canApprove =
    (status === 'pending' && (isSupervisor || isAdmin)) ||
    (status === 'pending-plant-manager' && (isPlantManager || isAdmin));
  const canReject =
    (status === 'pending' && (isSupervisor || isAdmin)) ||
    (status === 'pending-plant-manager' && (isPlantManager || isAdmin));
  const canMarkAccounted = status === 'approved' && (isHR || isAdmin);

  // No actions available
  if (!canApprove && !canReject && !canMarkAccounted) {
    return null;
  }

  const getApproveButtonText = () => {
    if (status === 'pending-plant-manager') {
      return dict.actions.approve;
    }
    if (quotaInfo?.canGiveFinalApproval) {
      return dict.actions.approvePayment ?? 'Approve Payment';
    }
    if (quotaInfo && !quotaInfo.canGiveFinalApproval) {
      return dict.actions.approveEscalate ?? 'Forward to PM';
    }
    return dict.actions.approve;
  };

  return (
    <>
      {canApprove && (
        <Button
          variant='outline'
          className='w-full'
          onClick={() => setOpenDialog('approve')}
        >
          <Check className='h-4 w-4' />
          {getApproveButtonText()}
        </Button>
      )}

      {/* Slot for Correction button (after Approve, before Mark Accounted) */}
      {afterApproveSlot}

      {canMarkAccounted && (
        <Button
          variant='outline'
          className='w-full'
          onClick={() => setOpenDialog('markAccounted')}
        >
          <Calendar className='h-4 w-4' />
          {dict.actions.markAsAccounted}
        </Button>
      )}

      {canReject && (
        <Button
          variant='outline'
          className='w-full text-destructive hover:text-destructive'
          onClick={() => setOpenDialog('reject')}
        >
          <X className='h-4 w-4' />
          {dict.actions.reject}
        </Button>
      )}

      {/* Dialogs */}
      <ApproveSubmissionDialog
        isOpen={openDialog === 'approve'}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        submissionId={submissionId}
        session={session}
        dict={dict}
        isFinalApproval={quotaInfo?.canGiveFinalApproval}
        submissionHours={quotaInfo?.submissionHours}
        remainingQuota={quotaInfo?.remainingHours}
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
