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
import { convertToPayoutOvertimeSubmission as convertToPayout } from '../actions/approval';
import { Dictionary } from '../lib/dict';

interface ConvertToPayoutDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  submissionId: string;
  session: Session | null;
  dict: Dictionary;
}

export default function ConvertToPayoutDialog({
  isOpen,
  onOpenChange,
  submissionId,
  session,
  dict,
}: ConvertToPayoutDialogProps) {
  const handleConvertToPayout = async () => {
    const isPlantManager = session?.user?.roles?.includes('plant-manager');
    const isAdmin = session?.user?.roles?.includes('admin');

    if (!isPlantManager && !isAdmin) {
      toast.error(dict.errors.unauthorized);
      return;
    }

    onOpenChange(false);

    toast.promise(
      convertToPayout(submissionId).then((res) => {
        if (res.error) {
          throw new Error(res.error);
        }
        return res;
      }),
      {
        loading: dict.toast.convertingToPayout,
        success: dict.toast.convertedToPayout,
        error: (error) => {
          const errorMsg = error.message;
          if (errorMsg === 'unauthorized') return dict.errors.unauthorized;
          if (errorMsg === 'not found') return dict.errors.notFound;
          if (errorMsg === 'invalid status') return dict.errors.invalidStatus;
          if (errorMsg === 'already payout') return dict.errors.alreadyPayout;
          if (errorMsg === 'has scheduled day off') return dict.errors.hasScheduledDayOff;
          console.error('handleConvertToPayout', errorMsg);
          return dict.errors.contactIT;
        },
      },
    );
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dict.dialogs.convertToPayout.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {dict.dialogs.convertToPayout.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{dict.actions.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={handleConvertToPayout}>
            {dict.actions.convertToPayout}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
