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
import { cancelCorrection } from "../../actions/crud";
import type { Dictionary } from "../../lib/dict";

interface CancelCorrectionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  correctionId: string;
  dict: Dictionary;
}

export default function CancelCorrectionDialog({
  isOpen,
  onOpenChange,
  correctionId,
  dict,
}: CancelCorrectionDialogProps) {
  const handleCancel = async () => {
    toast.promise(
      cancelCorrection(correctionId).then((res) => {
        if ("error" in res) {
          throw new Error(res.error);
        }
        return res;
      }),
      {
        loading: dict.toast.cancelling,
        success: dict.toast.cancelled,
        error: (error) => {
          const errorMsg = error.message;
          if (errorMsg === "unauthorized") return dict.errors.unauthorized;
          if (errorMsg === "not found") return dict.errors.notFound;
          if (errorMsg === "invalid status") return dict.errors.invalidStatus;
          console.error("handleCancel", errorMsg);
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
          <AlertDialogTitle>{dict.dialogs.cancel.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {dict.dialogs.cancel.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {dict.dialogs.cancel.cancelButton}
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleCancel}>
            {dict.dialogs.cancel.confirmButton}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
