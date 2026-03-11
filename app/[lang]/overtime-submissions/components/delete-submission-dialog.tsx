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
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteOvertimeSubmission } from "../actions/crud";
import { Dictionary } from "../lib/dict";

interface DeleteSubmissionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  submissionId: string;
  dict: Dictionary;
  redirectAfterDelete?: boolean;
}

export default function DeleteSubmissionDialog({
  isOpen,
  onOpenChange,
  submissionId,
  dict,
  redirectAfterDelete = false,
}: DeleteSubmissionDialogProps) {
  const router = useRouter();

  const handleDelete = async () => {
    toast.promise(
      deleteOvertimeSubmission(submissionId).then((res) => {
        if ("error" in res) {
          throw new Error(res.error);
        }
        if (redirectAfterDelete) {
          router.push("/overtime-submissions");
        }
        return res;
      }),
      {
        loading: dict.toast.deleting,
        success: dict.toast.deleted,
        error: (error) => {
          const errorMsg = error.message;
          if (errorMsg === "unauthorized") return dict.errors.unauthorized;
          if (errorMsg === "not found") return dict.errors.notFound;
          if (errorMsg === "cannot delete") return dict.errors.cannotDelete;
          console.error("handleDelete", errorMsg);
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
