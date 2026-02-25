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
import { Session } from 'next-auth';
import { toast } from 'sonner';
import { approveOvertimeSubmission } from '../actions/approval';
import { Dictionary } from '../lib/dict';

type ApproveSubmissionDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  submissionId: string;
  session: Session | null;
  dict: Dictionary;
  isFinalApproval?: boolean;
  submissionHours?: number;
  remainingQuota?: number;
};

export default function ApproveSubmissionDialog({
  isOpen,
  onOpenChange,
  submissionId,
  session,
  dict,
  isFinalApproval,
  submissionHours,
  remainingQuota,
}: ApproveSubmissionDialogProps) {
  const handleApprove = async () => {
    toast.promise(
      approveOvertimeSubmission(submissionId).then((res) => {
        if (res.error) {
          throw new Error(res.error);
        }
        return res;
      }),
      {
        loading: dict.toast.approving,
        success: (res) => {
          if (res.success === 'supervisor-approved') {
            return dict.toast.supervisorApproved || dict.toast.approved;
          }
          if (res.success === 'plant-manager-approved') {
            return dict.toast.plantManagerApproved || dict.toast.approved;
          }
          return dict.toast.approved;
        },
        error: (error) => {
          const errorMsg = error.message;
          if (errorMsg === 'unauthorized') return dict.errors.unauthorizedToApprove;
          if (errorMsg === 'not found') return dict.errors.notFound;
          console.error('handleApprove', errorMsg);
          return dict.errors.contactIT;
        },
      },
    );
    onOpenChange(false);
  };

  // Determine title, description, and button text based on quota context
  const hasQuotaInfo = submissionHours !== undefined && remainingQuota !== undefined;

  let title: string;
  let description: string | undefined;
  let buttonText: string;

  if (isFinalApproval && hasQuotaInfo) {
    // Within quota — supervisor can give final approval
    title = dict.dialogs.approve.titlePayment ?? 'Approve Payment';
    description = (dict.dialogs.approve.descriptionPayment ?? '')
      .replace('{hours}', String(submissionHours))
      .replace('{remaining}', String(Math.max(0, remainingQuota - submissionHours)));
    buttonText = dict.actions.approvePayment ?? 'Approve Payment';
  } else if (isFinalApproval === false && hasQuotaInfo) {
    // Exceeds quota — will escalate to plant manager
    title = dict.dialogs.approve.titleEscalate ?? 'Forward to Plant Manager';
    description = (dict.dialogs.approve.descriptionEscalate ?? '')
      .replace('{hours}', String(submissionHours));
    buttonText = dict.actions.approveEscalate ?? 'Forward to Plant Manager';
  } else {
    // No quota context (non-payout submission, or plant-manager/admin)
    title = dict.dialogs.approve.title;
    description = undefined;
    buttonText = dict.actions.approve;
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{dict.actions.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={handleApprove}>
            {buttonText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
