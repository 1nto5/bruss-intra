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
import { Session } from "next-auth";
import { toast } from "sonner";
import { markAsAccountedOvertimeSubmission as markAsAccounted } from "../actions/approval";
import { Dictionary } from "../lib/dict";

interface MarkAsAccountedDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  submissionId: string;
  session: Session | null;
  dict: Dictionary;
}

export default function MarkAsAccountedDialog({
  isOpen,
  onOpenChange,
  submissionId,
  session,
  dict,
}: MarkAsAccountedDialogProps) {
  const handleMarkAsAccounted = async () => {
    // Check if user has HR or admin role
    const roles = session?.user?.roles || [];
    const canMarkAsAccounted = roles.includes("hr") || roles.includes("admin");

    if (!canMarkAsAccounted) {
      toast.error(dict.errors.onlyHRCanMarkAsAccounted);
      return;
    }

    onOpenChange(false);

    toast.promise(
      markAsAccounted(submissionId).then((res) => {
        if (res.error) {
          throw new Error(res.error);
        }
        return res;
      }),
      {
        loading: dict.toast.markingAsAccounted,
        success: dict.toast.markedAsAccounted,
        error: (error) => {
          const errorMsg = error.message;
          if (errorMsg === "unauthorized") return dict.errors.unauthorized;
          if (errorMsg === "not found") return dict.errors.notFound;
          if (errorMsg === "invalid status") return dict.errors.invalidStatus;
          console.error("handleMarkAsAccounted", errorMsg);
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
            {dict.dialogs.markAsAccounted.title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {dict.dialogs.markAsAccounted.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{dict.actions.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={handleMarkAsAccounted}>
            {dict.actions.markAsAccounted}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
