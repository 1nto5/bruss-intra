'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { toast } from 'sonner';
import { rejectOrder } from '../actions/approval';
import { Dictionary } from '../lib/dict';

interface RejectOrderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  dict: Dictionary;
}

export default function RejectOrderDialog({
  isOpen,
  onOpenChange,
  orderId,
  dict,
}: RejectOrderDialogProps) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [isPending, setIsPending] = useState(false);

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error(dict.toast.provideRejectionReason);
      return;
    }

    setIsPending(true);
    toast.promise(
      rejectOrder(orderId, rejectionReason).then((res) => {
        if ('error' in res) {
          throw new Error(res.error);
        }
        return res;
      }),
      {
        loading: dict.toast.rejecting,
        success: dict.toast.rejected,
        error: (error) => {
          const errorMsg = error.message;
          if (errorMsg === 'unauthorized') return dict.errors.unauthorizedToReject;
          if (errorMsg === 'not found') return dict.errors.notFound;
          if (errorMsg === 'invalid status') return dict.errors.invalidStatus;
          console.error('handleReject', errorMsg);
          return dict.errors.rejectionError;
        },
      },
    );
    setRejectionReason('');
    setIsPending(false);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setRejectionReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dict.dialogs.reject.title}</DialogTitle>
        </DialogHeader>
        <Textarea
          placeholder={dict.dialogs.reject.reasonPlaceholder}
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          rows={4}
        />
        <DialogFooter>
          <Button variant='outline' onClick={handleCancel} disabled={isPending}>
            {dict.actions.cancel}
          </Button>
          <Button variant='destructive' onClick={handleReject} disabled={isPending}>
            {dict.dialogs.reject.buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
