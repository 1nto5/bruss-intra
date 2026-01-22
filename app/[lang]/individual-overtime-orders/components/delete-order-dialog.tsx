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
import { deleteOrder } from '../actions/crud';
import { redirectToOrders } from '../actions/utils';
import { Dictionary } from '../lib/dict';
import { Locale } from '@/lib/config/i18n';

interface DeleteOrderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  dict: Dictionary;
  lang: Locale;
}

export default function DeleteOrderDialog({
  isOpen,
  onOpenChange,
  orderId,
  dict,
  lang,
}: DeleteOrderDialogProps) {
  const handleDelete = async () => {
    toast.promise(
      deleteOrder(orderId).then((res) => {
        if ('error' in res) {
          throw new Error(res.error);
        }
        redirectToOrders(lang);
        return res;
      }),
      {
        loading: dict.toast.deleting,
        success: dict.toast.deleted,
        error: (error) => {
          const errorMsg = error.message;
          if (errorMsg === 'unauthorized') return dict.errors.unauthorized;
          if (errorMsg === 'not found') return dict.errors.notFound;
          console.error('handleDelete', errorMsg);
          return dict.errors.cannotDelete;
        },
      },
    );
    onOpenChange(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dict.dialogs.delete.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {dict.dialogs.delete.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{dict.actions.cancel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
          >
            {dict.dialogs.delete.confirmButton}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
