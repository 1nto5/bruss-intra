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
import { cancelOvertimeRequest } from '../actions/approval';
import { Dictionary } from '../lib/dict';

interface CancelRequestDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  dict: Dictionary;
}

export default function CancelRequestDialog({
  isOpen,
  onOpenChange,
  requestId,
  dict,
}: CancelRequestDialogProps) {
  const handleCancel = async () => {
    toast.promise(
      cancelOvertimeRequest(requestId).then((res) => {
        if (res.error) {
          throw new Error(res.error);
        }
        return res;
      }),
      {
        loading: dict.cancelRequestDialog.toast.loading,
        success: dict.cancelRequestDialog.toast.success,
        error: (error) => {
          const errorMsg = error.message;
          if (errorMsg === 'unauthorized') return dict.cancelRequestDialog.toast.unauthorized;
          if (errorMsg === 'not found') return dict.cancelRequestDialog.toast.notFound;
          if (errorMsg === 'cannot cancel')
            return dict.cancelRequestDialog.toast.cannotCancel;
          console.error('handleCancel', errorMsg);
          return dict.cancelRequestDialog.toast.contactIT;
        },
      },
    );
    onOpenChange(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dict.cancelRequestDialog.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {dict.cancelRequestDialog.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{dict.cancelRequestDialog.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={handleCancel}>
            {dict.cancelRequestDialog.action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
