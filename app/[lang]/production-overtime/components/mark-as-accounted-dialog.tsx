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
import { markAsAccountedOvertimeRequest as markAsAccounted } from '../actions/approval';
import { Dictionary } from '../lib/dict';

interface MarkAsAccountedDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  session: Session | null;
  dict: Dictionary;
}

export default function MarkAsAccountedDialog({
  isOpen,
  onOpenChange,
  requestId,
  session,
  dict,
}: MarkAsAccountedDialogProps) {
  const handleMarkAsAccounted = async () => {
    // Check if user has HR role
    const isHR = session?.user?.roles?.includes('hr');

    if (!isHR) {
      toast.error(dict.markAsAccountedDialog.toast.onlyHR);
      return;
    }

    onOpenChange(false);

    toast.promise(
      markAsAccounted(requestId).then((res) => {
        if (res.error) {
          throw new Error(res.error);
        }
        return res;
      }),
      {
        loading: dict.markAsAccountedDialog.toast.loading,
        success: dict.markAsAccountedDialog.toast.success,
        error: (error) => {
          const errorMsg = error.message;
          if (errorMsg === 'unauthorized') return dict.markAsAccountedDialog.toast.unauthorized;
          if (errorMsg === 'not found') return dict.markAsAccountedDialog.toast.notFound;
          if (errorMsg === 'invalid status')
            return dict.markAsAccountedDialog.toast.invalidStatus;
          console.error('handleMarkAsAccounted', errorMsg);
          return dict.markAsAccountedDialog.toast.contactIT;
        },
      },
    );
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dict.markAsAccountedDialog.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {dict.markAsAccountedDialog.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{dict.common.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={handleMarkAsAccounted}>
            {dict.markAsAccountedDialog.action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
