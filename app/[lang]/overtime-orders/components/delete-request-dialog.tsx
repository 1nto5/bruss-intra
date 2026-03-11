"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { bulkDeleteOvertimeRequests } from "../actions/bulk";
import { Dictionary } from "../lib/dict";

interface DeleteRequestDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  dict: Dictionary;
}

export default function DeleteRequestDialog({
  isOpen,
  onOpenChange,
  requestId,
  dict,
}: DeleteRequestDialogProps) {
  const handleDelete = async () => {
    onOpenChange(false);

    toast.promise(
      bulkDeleteOvertimeRequests([requestId]).then((res) => {
        if (res.error) {
          throw new Error(res.error);
        }
        return res;
      }),
      {
        loading: dict.dialogs.delete.deleting,
        success: dict.dialogs.delete.deleted,
        error: (error) => {
          const errorMsg = error.message;
          if (errorMsg === "unauthorized") return dict.errors.unauthorized;
          if (errorMsg === "not found") return dict.errors.notFound;
          console.error("handleDelete", errorMsg);
          return dict.errors.contactIT;
        },
      },
    );
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
          <AlertDialogCancel>
            {dict.dialogs.delete.cancelButton}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {dict.dialogs.delete.confirmButton}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
