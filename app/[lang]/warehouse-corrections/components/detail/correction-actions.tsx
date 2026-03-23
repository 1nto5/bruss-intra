"use client";

import { Button } from "@/components/ui/button";
import LocalizedLink from "@/components/localized-link";
import {
  ArrowLeft,
  Edit,
  RotateCcw,
  Send,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Session } from "next-auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { submitCorrection } from "../../actions/crud";
import type { Dictionary } from "../../lib/dict";
import type { CorrectionDoc } from "../../lib/types";
import {
  canEditCorrection,
  canCancelCorrection,
  canSubmitCorrection,
  canDeleteCorrection,
  canReactivateCorrection,
  canPost,
} from "../../lib/permissions";
import CancelCorrectionDialog from "../dialogs/cancel-correction-dialog";
import DeleteCorrectionDialog from "../dialogs/delete-correction-dialog";
import PostDialog from "../dialogs/post-dialog";
import ReactivateCorrectionDialog from "../dialogs/reactivate-correction-dialog";

interface CorrectionActionsProps {
  correction: CorrectionDoc;
  session: Session | null;
  dict: Dictionary;
  lang: string;
}

type DialogType =
  | "post"
  | "cancel"
  | "delete"
  | "reactivate"
  | null;

export default function CorrectionActions({
  correction,
  session,
  dict,
  lang,
}: CorrectionActionsProps) {
  const [openDialog, setOpenDialog] = useState<DialogType>(null);
  const router = useRouter();

  const roles = session?.user?.roles || [];
  const email = session?.user?.email || "";
  const correctionId = correction._id.toString();

  const showEdit = canEditCorrection(roles, email, correction);
  const showSubmit = canSubmitCorrection(roles, email, correction);
  const showCancel = canCancelCorrection(roles, email, correction);
  const showDelete = canDeleteCorrection(roles);
  const showReactivate = canReactivateCorrection(roles, correction);
  const showPost =
    canPost(roles) && correction.status === "approved";

  const handleSubmit = async () => {
    toast.promise(
      submitCorrection(correctionId).then((res) => {
        if ("error" in res) throw new Error(res.error);
        return res;
      }),
      {
        loading: dict.common.loading,
        success: dict.toast.submitted,
        error: () => dict.errors.contactIT,
      },
    );
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {showEdit && (
          <LocalizedLink
            href={`/warehouse-corrections/${correction._id}/edit`}
          >
            <Button variant="outline">
              <Edit className="h-4 w-4" /> {dict.actions.edit}
            </Button>
          </LocalizedLink>
        )}

        {showSubmit && (
          <Button variant="default" onClick={handleSubmit}>
            <Send className="h-4 w-4" /> {dict.actions.submit}
          </Button>
        )}

        {showPost && (
          <Button variant="outline" onClick={() => setOpenDialog("post")}>
            <Upload className="h-4 w-4" /> {dict.actions.post}
          </Button>
        )}

        {showReactivate && (
          <Button variant="outline" onClick={() => setOpenDialog("reactivate")}>
            <RotateCcw className="h-4 w-4" /> {dict.actions.reactivate}
          </Button>
        )}

        {showCancel && (
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setOpenDialog("cancel")}
          >
            <X className="h-4 w-4" /> {dict.actions.cancel}
          </Button>
        )}

        {showDelete && (
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setOpenDialog("delete")}
          >
            <Trash2 className="h-4 w-4" /> {dict.actions.delete}
          </Button>
        )}

        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" /> {dict.detail.backToList}
        </Button>
      </div>

      {/* Dialogs */}
      <PostDialog
        isOpen={openDialog === "post"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        correctionId={correctionId}
        dict={dict}
      />

      <CancelCorrectionDialog
        isOpen={openDialog === "cancel"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        correctionId={correctionId}
        dict={dict}
      />

      <DeleteCorrectionDialog
        isOpen={openDialog === "delete"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        correctionId={correctionId}
        dict={dict}
      />

      <ReactivateCorrectionDialog
        isOpen={openDialog === "reactivate"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        correctionId={correctionId}
        dict={dict}
      />
    </>
  );
}
