"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import LocalizedLink from "@/components/localized-link";
import { extractNameFromEmail } from "@/lib/utils/name-format";
import { formatDateTime } from "@/lib/utils/date-format";
import { ColumnDef } from "@tanstack/react-table";
import { Check, Eye, X } from "lucide-react";
import { Session } from "next-auth";
import { useState } from "react";
import type { Dictionary } from "../../../lib/dict";
import type { ApprovalRole, CorrectionDoc } from "../../../lib/types";
import { getApprovalRolesForUser } from "../../../lib/permissions";
import ApproveDialog from "../../dialogs/approve-dialog";
import RejectDialog from "../../dialogs/reject-dialog";

type ApprovalQueueItem = CorrectionDoc & {
  pendingApprovals: { role: string; status: string }[];
};

export const createApprovalColumns = (
  session: Session | null,
  dict: Dictionary,
  lang?: string,
): ColumnDef<ApprovalQueueItem>[] => {
  const userRoles = session?.user?.roles || [];
  const userApprovalRoles = getApprovalRolesForUser(userRoles);

  return [
    {
      accessorKey: "correctionNumber",
      header: dict.columns.correctionNumber,
      cell: ({ row }) => (
        <div className="font-medium">
          {row.getValue("correctionNumber")}
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: dict.columns.type,
      cell: ({ row }) => (
        <Badge variant="outline">
          {dict.types[row.getValue("type") as keyof typeof dict.types]}
        </Badge>
      ),
    },
    {
      accessorKey: "createdBy",
      header: dict.columns.createdBy,
      cell: ({ row }) => (
        <div className="whitespace-nowrap">
          {extractNameFromEmail(row.getValue("createdBy"))}
        </div>
      ),
    },
    {
      accessorKey: "submittedAt",
      header: dict.columns.submittedAt,
      cell: ({ row }) => {
        const date = row.getValue("submittedAt") as string;
        return date ? (
          <div className="whitespace-nowrap">
            {formatDateTime(new Date(date))}
          </div>
        ) : (
          "-"
        );
      },
    },
    {
      accessorKey: "totalValue",
      header: dict.columns.totalValue,
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {(row.getValue("totalValue") as number)?.toFixed(2)} EUR
        </div>
      ),
    },
    {
      id: "pendingRoles",
      header: dict.columns.pendingRoles,
      cell: ({ row }) => {
        const pendingApprovals = row.original.pendingApprovals || [];
        return (
          <div className="flex flex-wrap gap-1">
            {pendingApprovals.map((a, i) => (
              <Badge key={i} variant="statusPending" className="text-xs">
                {dict.approvalRoles[a.role as ApprovalRole] || a.role}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: dict.columns.actions,
      cell: ({ row }) => {
        const correction = row.original;
        const [isApproveOpen, setIsApproveOpen] = useState(false);
        const [isRejectOpen, setIsRejectOpen] = useState(false);

        return (
          <div className="flex gap-1">
            <LocalizedLink
              href={`/warehouse-corrections/${correction._id}`}
            >
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </LocalizedLink>
            <Button
              variant="ghost"
              size="sm"
              className="text-green-600"
              onClick={() => setIsApproveOpen(true)}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => setIsRejectOpen(true)}
            >
              <X className="h-4 w-4" />
            </Button>

            <ApproveDialog
              isOpen={isApproveOpen}
              onOpenChange={setIsApproveOpen}
              correctionId={correction._id.toString()}
              userApprovalRoles={userApprovalRoles}
              dict={dict}
            />
            <RejectDialog
              isOpen={isRejectOpen}
              onOpenChange={setIsRejectOpen}
              correctionId={correction._id.toString()}
              dict={dict}
            />
          </div>
        );
      },
    },
  ];
};
