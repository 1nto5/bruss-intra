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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { toast } from 'sonner';
import { cancelOrder } from '../actions/crud';
import { Dictionary } from '../lib/dict';

interface CancelOrderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  dict: Dictionary;
}

export default function CancelOrderDialog({
  isOpen,
  onOpenChange,
  orderId,
  dict,
}: CancelOrderDialogProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCancel = async () => {
    if (!reason.trim()) {
      toast.error(dict.errors?.cancellationReasonRequired || 'Cancellation reason is required');
      return;
    }

    setIsSubmitting(true);
    toast.promise(
      cancelOrder(orderId, reason).then((res) => {
        if ('error' in res) {
          throw new Error(res.error);
        }
        setReason('');
        return res;
      }),
      {
        loading: dict.toast.cancelling,
        success: dict.toast.cancelled,
        error: (error) => {
          const errorMsg = error.message;
          if (errorMsg === 'unauthorized') return dict.errors.unauthorized;
          if (errorMsg === 'not found') return dict.errors.notFound;
          if (errorMsg === 'cannot cancel') return dict.errors.cannotCancel;
          console.error('handleCancel', errorMsg);
          return dict.errors.cancellationError;
        },
      },
    );
    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dict.dialogs.cancel.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {dict.dialogs.cancel.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className='py-4'>
          <Label htmlFor='cancel-reason'>{dict.dialogs.cancel.reasonLabel}</Label>
          <Textarea
            id='cancel-reason'
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={dict.dialogs.cancel.reasonPlaceholder}
            className='mt-2'
            rows={3}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>{dict.dialogs.cancel.cancelButton}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={isSubmitting || !reason.trim()}
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
          >
            {dict.dialogs.cancel.confirmButton}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
