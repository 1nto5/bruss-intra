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
import { preApproveOvertimeRequest as preApprove } from '../actions/approval';
import { Dictionary } from '../lib/dict';

interface PreApproveRequestDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  session: Session | null;
  dict: Dictionary;
}

export default function PreApproveRequestDialog({
  isOpen,
  onOpenChange,
  requestId,
  session,
  dict,
}: PreApproveRequestDialogProps) {
  const handlePreApprove = async () => {
    // Check if user has production-manager or admin role
    const isProductionManager = session?.user?.roles?.includes('production-manager');
    const isAdmin = session?.user?.roles?.includes('admin');

    if (!isProductionManager && !isAdmin) {
      toast.error(dict.preApproveRequestDialog.toast.onlyProductionManager);
      return;
    }

    onOpenChange(false);

    toast.promise(
      preApprove(requestId).then((res) => {
        if (res.error) {
          throw new Error(res.error);
        }
        return res;
      }),
      {
        loading: dict.preApproveRequestDialog.toast.loading,
        success: dict.preApproveRequestDialog.toast.success,
        error: (error) => {
          const errorMsg = error.message;
          if (errorMsg === 'unauthorized') return dict.preApproveRequestDialog.toast.unauthorized;
          if (errorMsg === 'not found') return dict.preApproveRequestDialog.toast.notFound;
          if (errorMsg === 'invalid status') return dict.preApproveRequestDialog.toast.invalidStatus;
          console.error('handlePreApprove', errorMsg);
          return dict.preApproveRequestDialog.toast.contactIT;
        },
      },
    );
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dict.preApproveRequestDialog.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {dict.preApproveRequestDialog.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{dict.common.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={handlePreApprove}>
            {dict.preApproveRequestDialog.action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
