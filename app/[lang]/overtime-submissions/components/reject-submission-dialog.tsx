'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Session } from 'next-auth';
import * as React from 'react';
import { toast } from 'sonner';
import { rejectOvertimeSubmission } from '../actions/approval';
import { Dictionary } from '../lib/dict';

type RejectSubmissionDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  submissionId: string;
  session: Session | null;
  dict: Dictionary;
};

export default function RejectSubmissionDialog({
  isOpen,
  onOpenChange,
  submissionId,
  session,
  dict,
}: RejectSubmissionDialogProps) {
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState('');

  const handleReject = async (e: React.MouseEvent) => {
    if (!reason.trim()) {
      e.preventDefault();
      setError(dict.validation.rejectionReasonRequired);
      return;
    }
    if (reason.length > 500) {
      e.preventDefault();
      setError(dict.validation.rejectionReasonTooLong);
      return;
    }

    toast.promise(
      rejectOvertimeSubmission(submissionId, reason).then((res) => {
        if (res.error) {
          throw new Error(res.error);
        }
        return res;
      }),
      {
        loading: dict.toast.rejecting,
        success: dict.toast.rejected,
        error: (err) => {
          const errorMsg = err.message;
          if (errorMsg === 'unauthorized') return dict.errors.unauthorizedToReject;
          if (errorMsg === 'not found') return dict.errors.notFound;
          console.error('handleReject', errorMsg);
          return dict.errors.contactIT;
        },
      },
    );
    setReason('');
    setError('');
  };

  const handleCancel = () => {
    setReason('');
    setError('');
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dict.dialogs.reject.title}</AlertDialogTitle>
        </AlertDialogHeader>
        <div className='grid gap-2'>
          <Textarea
            placeholder={dict.dialogs.reject.reasonPlaceholder}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError('');
            }}
            rows={3}
            className='resize-none'
          />
          {error && <p className='text-sm text-destructive'>{error}</p>}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {dict.actions.cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReject}
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
          >
            {dict.dialogs.reject.buttonText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
