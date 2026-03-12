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
import { deleteAppointment } from "../actions";
import type { Dictionary } from "../lib/dict";

interface DeleteAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  dict: Dictionary;
  onDeleted: () => void;
}

export default function DeleteAppointmentDialog({
  open,
  onOpenChange,
  appointmentId,
  dict,
  onDeleted,
}: DeleteAppointmentDialogProps) {
  const handleDelete = async () => {
    onOpenChange(false);

    toast.promise(
      deleteAppointment(appointmentId).then((res) => {
        if (res.error) throw new Error(res.error);
        onDeleted();
        return res;
      }),
      {
        loading: dict.toast.deleting,
        success: dict.toast.deleted,
        error: (error) => {
          const msg = error.message;
          if (msg === "unauthorized") return dict.errors.unauthorized;
          if (msg === "not found") return dict.errors.notFound;
          console.error("handleDelete", msg);
          return dict.errors.contactIT;
        },
      },
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dict.form.delete}</AlertDialogTitle>
          <AlertDialogDescription>
            {dict.form.deleteConfirm}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{dict.form.cancel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {dict.form.delete}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
