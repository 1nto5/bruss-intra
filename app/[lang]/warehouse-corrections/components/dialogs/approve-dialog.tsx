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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { approveCorrection } from "../../actions/approval";
import type { Dictionary } from "../../lib/dict";
import type { ApprovalRole } from "../../lib/types";

interface ApproveDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  correctionId: string;
  userApprovalRoles: ApprovalRole[];
  dict: Dictionary;
}

export default function ApproveDialog({
  isOpen,
  onOpenChange,
  correctionId,
  userApprovalRoles,
  dict,
}: ApproveDialogProps) {
  const handleApprove = async () => {
    onOpenChange(false);
    toast.promise(
      approveCorrection(correctionId).then((res) => {
        if ("error" in res) throw new Error(res.error);
        return res;
      }),
      {
        loading: dict.toast.approving,
        success: dict.toast.approved,
        error: (error) => {
          const errorMsg = error.message;
          if (errorMsg === "unauthorized") return dict.errors.unauthorized;
          if (errorMsg === "already approved")
            return dict.errors.alreadyApproved;
          console.error("handleApprove", errorMsg);
          return dict.errors.contactIT;
        },
      },
    );
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dict.approval.approveTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {dict.approval.approveDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="px-6 pb-2">
          <p className="mb-2 text-sm font-medium">
            {dict.approval.approvingAs}
          </p>
          <div className="flex flex-wrap gap-1">
            {userApprovalRoles.map((role) => (
              <Badge key={role} variant="outline">
                {dict.approvalRoles[role]}
              </Badge>
            ))}
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>{dict.common.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={handleApprove}>
            {dict.actions.approve}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
