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
import { approveOrder } from '../actions/approval';
import { Dictionary } from '../lib/dict';

interface ApproveOrderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  dict: Dictionary;
}

export default function ApproveOrderDialog({
  isOpen,
  onOpenChange,
  orderId,
  dict,
}: ApproveOrderDialogProps) {
  const handleApprove = async () => {
    toast.promise(
      approveOrder(orderId).then((res) => {
        if ('error' in res) {
          throw new Error(res.error);
        }
        return res;
      }),
      {
        loading: dict.toast.approving,
        success: dict.toast.approved,
        error: (error) => {
          const errorMsg = error.message;
          if (errorMsg === 'unauthorized') return dict.errors.unauthorizedToApprove;
          if (errorMsg === 'not found') return dict.errors.notFound;
          if (errorMsg === 'invalid status') return dict.errors.invalidStatus;
          console.error('handleApprove', errorMsg);
          return dict.errors.approvalError;
        },
      },
    );
    onOpenChange(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dict.dialogs.approve.title}</AlertDialogTitle>
          <AlertDialogDescription />
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{dict.actions.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={handleApprove}>
            {dict.actions.approve}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
