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
import { deleteItem } from "../../actions/crud";
import { Dictionary } from "../../lib/dict";
import { ITInventoryItem } from "../../lib/types";

export default function DeleteItemDialog({
  item,
  dict,
  lang,
  open,
  onOpenChange,
}: {
  item: ITInventoryItem;
  dict: Dictionary;
  lang: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();

  const handleDelete = async () => {
    onOpenChange(false);

    toast.promise(
      deleteItem(item._id).then((result) => {
        if ("error" in result) {
          throw new Error(result.error);
        }
        router.refresh();
        return result;
      }),
      {
        loading: dict.dialogs.delete.deleting,
        success: dict.dialogs.delete.deleted,
        error: (error) => error.message || dict.toast.error,
      },
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dict.dialogs.delete.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {dict.dialogs.delete.description}
            <div className="mt-2 font-semibold">
              {item.assetId} - {item.manufacturer} {item.model}
            </div>
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
