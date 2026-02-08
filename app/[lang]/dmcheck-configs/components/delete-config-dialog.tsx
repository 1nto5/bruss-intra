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
import { deleteConfig } from '../actions/crud';
import { Dictionary } from '../lib/dict';

interface DeleteConfigDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  configId: string;
  dict: Dictionary;
}

export default function DeleteConfigDialog({
  isOpen,
  onOpenChange,
  configId,
  dict,
}: DeleteConfigDialogProps) {
  const handleDelete = async () => {
    toast.promise(
      deleteConfig(configId).then((res) => {
        if ('error' in res) {
          throw new Error(res.error);
        }
        return res;
      }),
      {
        loading: dict.toast.deleting,
        success: dict.toast.deleted,
        error: (error) => {
          const errorMsg = error.message;
          if (errorMsg === 'unauthorized') return dict.errors.unauthorized;
          if (errorMsg === 'not found') return dict.errors.notFound;
          return dict.errors.contactIT;
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
          <AlertDialogAction onClick={handleDelete}>
            {dict.dialogs.delete.confirmButton}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
