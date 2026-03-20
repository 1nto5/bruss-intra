"use client";

import { Button } from "@/components/ui/button";
import LocalizedLink from "@/components/localized-link";
import { Edit, Send, X } from "lucide-react";
import { Session } from "next-auth";
import { useState } from "react";
import { toast } from "sonner";
import { submitCorrection } from "../../actions/crud";
import type { Dictionary } from "../../lib/dict";
import type { CorrectionDoc } from "../../lib/types";
import {
  canEditCorrection,
  canCancelCorrection,
  canSubmitCorrection,
} from "../../lib/permissions";
import CancelCorrectionDialog from "../dialogs/cancel-correction-dialog";

interface CorrectionActionsProps {
  correction: CorrectionDoc;
  session: Session | null;
  dict: Dictionary;
  lang: string;
}

export default function CorrectionActions({
  correction,
  session,
  dict,
  lang,
}: CorrectionActionsProps) {
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const roles = session?.user?.roles || [];
  const email = session?.user?.email || "";

  const showEdit = canEditCorrection(roles, email, correction);
  const showCancel = canCancelCorrection(roles, email, correction);
  const showSubmit = canSubmitCorrection(roles, email, correction);

  const handleSubmit = async () => {
    toast.promise(
      submitCorrection(correction._id.toString()).then((res) => {
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

  if (!showEdit && !showCancel && !showSubmit) return null;

  return (
    <div className="flex gap-2">
      {showEdit && (
        <LocalizedLink
          href={`/warehouse-corrections/${correction._id}/edit`}
        >
          <Button variant="outline" size="sm">
            <Edit /> {dict.actions.edit}
          </Button>
        </LocalizedLink>
      )}
      {showSubmit && (
        <Button variant="default" size="sm" onClick={handleSubmit}>
          <Send /> {dict.actions.submit}
        </Button>
      )}
      {showCancel && (
        <>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsCancelOpen(true)}
          >
            <X /> {dict.actions.cancel}
          </Button>
          <CancelCorrectionDialog
            isOpen={isCancelOpen}
            onOpenChange={setIsCancelOpen}
            correctionId={correction._id.toString()}
            dict={dict}
          />
        </>
      )}
    </div>
  );
}
