"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { rejectCorrection } from "../../actions/approval";
import type { Dictionary } from "../../lib/dict";

interface RejectDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  correctionId: string;
  dict: Dictionary;
}

export default function RejectDialog({
  isOpen,
  onOpenChange,
  correctionId,
  dict,
}: RejectDialogProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReject = async () => {
    if (reason.length < 10) return;
    setIsSubmitting(true);
    onOpenChange(false);

    toast.promise(
      rejectCorrection(correctionId, reason).then((res) => {
        if ("error" in res) throw new Error(res.error);
        setReason("");
        return res;
      }),
      {
        loading: dict.toast.rejecting,
        success: dict.toast.rejected,
        error: (error) => {
          const errorMsg = error.message;
          if (errorMsg === "unauthorized") return dict.errors.unauthorized;
          console.error("handleReject", errorMsg);
          return dict.errors.contactIT;
        },
      },
    );

    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dict.approval.rejectTitle}</DialogTitle>
          <DialogDescription>
            {dict.approval.rejectDescription}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>{dict.approval.rejectionReason}</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="resize-none"
          />
          {reason.length > 0 && reason.length < 10 && (
            <p className="text-xs text-destructive">
              {dict.validation.rejectionReasonMin}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {dict.common.cancel}
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={isSubmitting || reason.length < 10}
          >
            {isSubmitting && (
              <Loader className="animate-spin" />
            )}
            {dict.actions.reject}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
