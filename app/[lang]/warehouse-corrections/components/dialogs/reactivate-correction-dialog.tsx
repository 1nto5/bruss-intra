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
import { reactivateCorrection } from "../../actions/crud";
import type { Dictionary } from "../../lib/dict";

interface ReactivateCorrectionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  correctionId: string;
  dict: Dictionary;
}

export default function ReactivateCorrectionDialog({
  isOpen,
  onOpenChange,
  correctionId,
  dict,
}: ReactivateCorrectionDialogProps) {
  const handleReactivate = async () => {
    onOpenChange(false);

    toast.promise(
      reactivateCorrection(correctionId).then((res) => {
        if ("error" in res) throw new Error(res.error);
        return res;
      }),
      {
        loading: dict.toast.reactivating,
        success: dict.toast.reactivated,
        error: (error) => {
          const errorMsg = error.message;
          if (errorMsg === "unauthorized") return dict.errors.unauthorized;
          if (errorMsg === "not found") return dict.errors.notFound;
          console.error("handleReactivate", errorMsg);
          return dict.errors.contactIT;
        },
      },
    );
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {dict.dialogs.reactivate.title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {dict.dialogs.reactivate.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {dict.dialogs.reactivate.cancelButton}
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleReactivate}>
            {dict.dialogs.reactivate.confirmButton}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
