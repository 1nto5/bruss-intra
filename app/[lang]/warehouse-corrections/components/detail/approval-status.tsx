"use client";

import { Badge } from "@/components/ui/badge";
import { extractNameFromEmail } from "@/lib/utils/name-format";
import { formatDateTime } from "@/lib/utils/date-format";
import type { Dictionary } from "../../lib/dict";
import type { ApprovalRecord, ApprovalRole } from "../../lib/types";

interface ApprovalStatusProps {
  approvals: ApprovalRecord[];
  dict: Dictionary;
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
}: ApprovalStatusProps) {
  if (!approvals || approvals.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {dict.detail.noApprovals}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {approvals.map((approval) => (
        <div
          key={approval._id?.toString()}
          className="flex items-center justify-between rounded-md border p-3"
        >
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
              ? dict.status.draft
              : approval.status === "approved"
                ? dict.status.approved
                : dict.status.rejected}
          </Badge>
        </div>
      ))}
    </div>
  );
}
