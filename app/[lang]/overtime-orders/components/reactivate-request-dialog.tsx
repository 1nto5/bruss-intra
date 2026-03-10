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
import { reactivateOvertimeRequest } from "../actions/approval";
import { Dictionary } from "../lib/dict";

interface ReactivateRequestDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  dict: Dictionary;
}

export default function ReactivateRequestDialog({
  isOpen,
  onOpenChange,
  requestId,
  dict,
}: ReactivateRequestDialogProps) {
  const handleReactivate = async () => {
    onOpenChange(false);

    toast.promise(
      reactivateOvertimeRequest(requestId).then((res) => {
        if (res.error) {
          throw new Error(res.error);
        }
        return res;
      }),
      {
        loading: dict.dialogs.reactivate.reactivating,
        success: dict.dialogs.reactivate.reactivated,
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
          <AlertDialogTitle>{dict.dialogs.reactivate.title}</AlertDialogTitle>
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
