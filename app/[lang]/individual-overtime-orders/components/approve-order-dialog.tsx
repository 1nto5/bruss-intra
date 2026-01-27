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
  isFinalApproval?: boolean;
  orderHours?: number;
  remainingQuota?: number;
}

export default function ApproveOrderDialog({
  isOpen,
  onOpenChange,
  orderId,
  dict,
  isFinalApproval,
  orderHours,
  remainingQuota,
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

  const title = isFinalApproval
    ? dict.dialogs.approve.titlePayment ?? 'Approve Payment'
    : dict.dialogs.approve.title;

  const description =
    isFinalApproval && orderHours !== undefined && remainingQuota !== undefined
      ? (dict.dialogs.approve.descriptionPayment ?? '')
          .replace('{hours}', String(orderHours))
          .replace('{remaining}', String(Math.max(0, remainingQuota - orderHours)))
      : undefined;

  const buttonText = isFinalApproval
    ? dict.actions.approvePayment ?? 'Approve Payment'
    : dict.actions.approve;

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
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
