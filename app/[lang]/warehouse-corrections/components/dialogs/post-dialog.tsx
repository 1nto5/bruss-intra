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
import { markAsPosted } from "../../actions/posting";
import type { Dictionary } from "../../lib/dict";

interface PostDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  correctionId: string;
  dict: Dictionary;
}

export default function PostDialog({
  isOpen,
  onOpenChange,
  correctionId,
  dict,
}: PostDialogProps) {
  const handlePost = async () => {
    onOpenChange(false);
    toast.promise(
      markAsPosted(correctionId).then((res) => {
        if ("error" in res) throw new Error(res.error);
        return res;
      }),
      {
        loading: dict.toast.posting,
        success: dict.toast.posted,
        error: (error) => {
          const errorMsg = error.message;
          if (errorMsg === "unauthorized") return dict.errors.unauthorized;
          if (errorMsg === "invalid status") return dict.errors.invalidStatus;
          console.error("handlePost", errorMsg);
          return dict.errors.contactIT;
        },
      },
    );
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dict.dialogs.post.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {dict.dialogs.post.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {dict.dialogs.post.cancelButton}
          </AlertDialogCancel>
          <AlertDialogAction onClick={handlePost}>
            {dict.dialogs.post.confirmButton}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
