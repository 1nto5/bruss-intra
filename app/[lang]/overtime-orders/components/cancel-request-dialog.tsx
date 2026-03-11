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
import { cancelOvertimeRequest } from "../actions/approval";
import { Dictionary } from "../lib/dict";

interface CancelRequestDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  dict: Dictionary;
}

export default function CancelRequestDialog({
  isOpen,
  onOpenChange,
  requestId,
  dict,
}: CancelRequestDialogProps) {
  const handleCancel = async () => {
    toast.promise(
      cancelOvertimeRequest(requestId).then((res) => {
        if (res.error) {
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
          if (errorMsg === "cannot cancel") return dict.errors.cannotCancel;
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
