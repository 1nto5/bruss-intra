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
import { approveOvertimeRequest as approve } from '../actions/approval';
import { Dictionary } from '../lib/dict';

interface ApproveRequestDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  session: Session | null;
  dict: Dictionary;
}

export default function ApproveRequestDialog({
  isOpen,
  onOpenChange,
  requestId,
  session,
  dict,
}: ApproveRequestDialogProps) {
  const handleApprove = async () => {
    // Check if user has plant-manager or admin role
    const isPlantManager = session?.user?.roles?.includes('plant-manager');
    const isAdmin = session?.user?.roles?.includes('admin');

    if (!isPlantManager && !isAdmin) {
      toast.error(dict.approveRequestDialog.toast.onlyPlantManager);
      return;
    }

    onOpenChange(false);

    toast.promise(
      approve(requestId).then((res) => {
        if (res.error) {
          throw new Error(res.error);
        }
        return res;
      }),
      {
        loading: dict.approveRequestDialog.toast.loading,
        success: dict.approveRequestDialog.toast.success,
        error: (error) => {
          const errorMsg = error.message;
          if (errorMsg === 'unauthorized') return dict.approveRequestDialog.toast.unauthorized;
          if (errorMsg === 'not found') return dict.approveRequestDialog.toast.notFound;
          console.error('handleApprove', errorMsg);
          return dict.approveRequestDialog.toast.contactIT;
        },
      },
    );
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dict.approveRequestDialog.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {dict.approveRequestDialog.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{dict.common.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={handleApprove}>
            {dict.approveRequestDialog.action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
