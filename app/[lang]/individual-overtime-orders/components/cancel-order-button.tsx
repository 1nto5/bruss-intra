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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CircleX } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { cancelOrder } from '../actions/crud';
import { Dictionary } from '../lib/dict';

interface CancelOrderButtonProps {
  orderId: string;
  dict: Dictionary;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
}

export default function CancelOrderButton({
  orderId,
  dict,
  variant = 'outline',
}: CancelOrderButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
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
          if (errorMsg === 'reason required') return dict.errors.cancellationReasonRequired;
          console.error('handleCancel', errorMsg);
          return dict.errors.cancellationError;
        },
      },
    );
    setIsSubmitting(false);
    setIsOpen(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size='sm'>
          <CircleX className='mr-1 h-4 w-4' />
          {dict.actions.cancelSubmission}
        </Button>
      </AlertDialogTrigger>
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
          >
            {dict.dialogs.cancel.confirmButton}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
