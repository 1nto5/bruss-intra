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
import { toast } from 'sonner';
import { cancelOvertimeSubmission } from '../actions/crud';
import { Dictionary } from '../lib/dict';

interface CancelSubmissionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  submissionId: string;
  dict: Dictionary;
}

export default function CancelSubmissionDialog({
  isOpen,
  onOpenChange,
  submissionId,
  dict,
}: CancelSubmissionDialogProps) {
  const handleCancel = async () => {
    toast.promise(
      cancelOvertimeSubmission(submissionId).then((res) => {
        if ('error' in res) {
          throw new Error(res.error);
        }
        return res;
      }),
      {
        loading: dict.toast?.cancelling || 'Cancelling...',
        success: dict.toast?.cancelled || 'Submission cancelled',
        error: (error) => {
          const errorMsg = error.message;
          if (errorMsg === 'unauthorized') return dict.errors.unauthorized;
          if (errorMsg === 'not found') return dict.errors.notFound;
          if (errorMsg === 'cannot cancel')
            return dict.errors?.cannotCancel || 'Cannot cancel this submission';
          console.error('handleCancel', errorMsg);
          return dict.errors.contactIT;
        },
      },
    );
    onOpenChange(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {dict.dialogs?.cancel?.title || 'Cancel submission?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {dict.dialogs?.cancel?.description ||
              'This action will cancel the submission. You can submit a new one if needed.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{dict.actions.cancel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
          >
            {dict.dialogs?.cancel?.confirmButton || 'Cancel submission'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
