"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { extractNameFromEmail } from "@/lib/utils/name-format";
import { formatDateTime } from "@/lib/utils/date-format";
import { Check, XCircle } from "lucide-react";
import { useState } from "react";
import type { Dictionary } from "../../lib/dict";
import type {
  ApprovalRecord,
  ApprovalRole,
  CorrectionStatus,
} from "../../lib/types";
import ApproveDialog from "../dialogs/approve-dialog";
import RejectDialog from "../dialogs/reject-dialog";

interface ApprovalStatusProps {
  approvals: ApprovalRecord[];
  dict: Dictionary;
  correctionId: string;
  correctionStatus: CorrectionStatus;
  userApprovalRoles: ApprovalRole[];
}

function getApprovalBadgeVariant(status: string) {
  switch (status) {
    case "pending":
      return "statusPending" as const;
    case "approved":
      return "statusApproved" as const;
    case "rejected":
      return "statusRejected" as const;
    default:
      return "outline" as const;
  }
}

export default function ApprovalStatus({
  approvals,
  dict,
  correctionId,
  correctionStatus,
  userApprovalRoles,
}: ApprovalStatusProps) {
  const [openDialog, setOpenDialog] = useState<"approve" | "reject" | null>(
    null,
  );

  if (!approvals || approvals.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {dict.detail.noApprovals}
      </p>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {approvals.map((approval) => {
          const canAct =
            correctionStatus === "in-approval" &&
            approval.status === "pending" &&
            userApprovalRoles.includes(approval.role as ApprovalRole);

          return (
            <div
              key={approval._id?.toString()}
              className="rounded-md border p-3"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">
                    {dict.approvalRoles[approval.role as ApprovalRole]}
                  </p>
                  {approval.decidedBy && (
                    <p className="text-sm text-muted-foreground">
                      {extractNameFromEmail(approval.decidedBy)}
                      {approval.decidedAt &&
                        ` - ${formatDateTime(new Date(approval.decidedAt))}`}
                    </p>
                  )}
                  {approval.rejectionReason && (
                    <p className="text-sm text-destructive">
                      {approval.rejectionReason}
                    </p>
                  )}
                </div>
                <Badge variant={getApprovalBadgeVariant(approval.status)}>
                  {approval.status === "pending"
                    ? dict.detail.pending
                    : approval.status === "approved"
                      ? dict.status.approved
                      : dict.status.rejected}
                </Badge>
              </div>
              {canAct && (
                <div className="mt-2 flex gap-2 border-t pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOpenDialog("approve")}
                  >
                    <Check className="h-4 w-4" /> {dict.actions.approve}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setOpenDialog("reject")}
                  >
                    <XCircle className="h-4 w-4" /> {dict.actions.reject}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ApproveDialog
        isOpen={openDialog === "approve"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        correctionId={correctionId}
        userApprovalRoles={userApprovalRoles}
        dict={dict}
      />

      <RejectDialog
        isOpen={openDialog === "reject"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        correctionId={correctionId}
        dict={dict}
      />
    </>
  );
}
