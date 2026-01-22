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
import { markAsAccountedOrder } from '../actions/approval';
import { Dictionary } from '../lib/dict';

interface MarkAsAccountedDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  dict: Dictionary;
}

export default function MarkAsAccountedDialog({
  isOpen,
  onOpenChange,
  orderId,
  dict,
}: MarkAsAccountedDialogProps) {
  const handleMarkAsAccounted = async () => {
    toast.promise(
      markAsAccountedOrder(orderId).then((res) => {
        if ('error' in res) {
          throw new Error(res.error);
        }
        return res;
      }),
      {
        loading: dict.toast.markingAsAccounted,
        success: dict.toast.markedAsAccounted,
        error: (error) => {
          const errorMsg = error.message;
          if (errorMsg === 'unauthorized') return dict.errors.onlyHRCanMarkAsAccounted;
          if (errorMsg === 'not found') return dict.errors.notFound;
          console.error('handleMarkAsAccounted', errorMsg);
          return dict.errors.settlementError;
        },
      },
    );
    onOpenChange(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dict.dialogs.markAsAccounted.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {dict.dialogs.markAsAccounted.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{dict.actions.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={handleMarkAsAccounted}>
            {dict.actions.markAsAccounted}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
