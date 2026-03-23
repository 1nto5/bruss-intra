"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LocalizedLink from "@/components/localized-link";
import { extractNameFromEmail } from "@/lib/utils/name-format";
import { formatDateTime } from "@/lib/utils/date-format";
import { ColumnDef } from "@tanstack/react-table";
import {
  Check,
  Edit,
  Eye,
  MoreHorizontal,
  RotateCcw,
  Send,
  Trash2,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { Session } from "next-auth";
import { useState } from "react";
import { toast } from "sonner";
import type { Dictionary } from "../../../lib/dict";
import type { CorrectionDoc, CorrectionKind, CorrectionStatus } from "../../../lib/types";
import {
  canEditCorrection,
  canSubmitCorrection,
  canCancelCorrection,
  canDeleteCorrection,
  canReactivateCorrection,
  canPost,
  getApprovalRolesForUser,
} from "../../../lib/permissions";
import { submitCorrection } from "../../../actions/crud";
import ApproveDialog from "../../dialogs/approve-dialog";
import CancelCorrectionDialog from "../../dialogs/cancel-correction-dialog";
import DeleteCorrectionDialog from "../../dialogs/delete-correction-dialog";
import PostDialog from "../../dialogs/post-dialog";
import ReactivateCorrectionDialog from "../../dialogs/reactivate-correction-dialog";
import RejectDialog from "../../dialogs/reject-dialog";

function getStatusBadgeVariant(
  status: CorrectionStatus,
): "statusPending" | "statusApproved" | "statusRejected" | "statusInProgress" | "statusClosed" | "outline" {
  switch (status) {
    case "draft":
      return "outline";
    case "submitted":
    case "in-approval":
      return "statusPending";
    case "approved":
      return "statusApproved";
    case "rejected":
      return "statusRejected";
    case "posted":
      return "statusClosed";
    case "cancelled":
      return "statusClosed";
    default:
      return "outline";
  }
}

function getTypeBadgeVariant(
  _type: CorrectionKind,
): "outline" {
  return "outline";
}

type DialogType =
  | "approve"
  | "reject"
  | "post"
  | "cancel"
  | "delete"
  | "reactivate"
  | null;

export const createColumns = (
  session: Session | null,
  dict: Dictionary,
  lang?: string,
): ColumnDef<CorrectionDoc>[] => {
  const roles = session?.user?.roles || [];
  const userEmail = session?.user?.email || "";
  const userApprovalRoles = getApprovalRolesForUser(roles);
  const isSAPPoster = canPost(roles);

  return [
    {
      accessorKey: "correctionNumber",
      header: dict.columns.correctionNumber,
      cell: ({ row }) => {
        const number = row.getValue("correctionNumber") as string;
        return <div className="font-medium">{number}</div>;
      },
    },
    {
      id: "actions",
      header: dict.columns.actions,
      cell: ({ row }) => {
        const correction = row.original;
        const correctionId = correction._id?.toString() ?? "";
        const [openDialog, setOpenDialog] = useState<DialogType>(null);

        const showEdit = canEditCorrection(roles, userEmail, correction);
        const showSubmit = canSubmitCorrection(roles, userEmail, correction);
        const showCancel = canCancelCorrection(roles, userEmail, correction);
        const showDelete = canDeleteCorrection(roles);
        const showReactivate = canReactivateCorrection(roles, correction);
        const showPost = isSAPPoster && correction.status === "approved";
        const showApprove =
          correction.status === "in-approval" && userApprovalRoles.length > 0;
        const showReject = showApprove;

        const hasWorkflowActions =
          showSubmit || showApprove || showReject || showPost || showReactivate;
        const hasDestructiveActions = showCancel || showDelete;

        const handleSubmit = () => {
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* Navigation */}
                <LocalizedLink
                  href={`/warehouse-corrections/${correction._id}`}
                >
                  <DropdownMenuItem>
                    <Eye />
                    <span>{dict.actions.view}</span>
                  </DropdownMenuItem>
                </LocalizedLink>
                {showEdit && (
                  <LocalizedLink
                    href={`/warehouse-corrections/${correction._id}/edit`}
                  >
                    <DropdownMenuItem>
                      <Edit />
                      <span>{dict.actions.edit}</span>
                    </DropdownMenuItem>
                  </LocalizedLink>
                )}

                {/* Workflow */}
                {hasWorkflowActions && <DropdownMenuSeparator />}
                {showSubmit && (
                  <DropdownMenuItem onSelect={handleSubmit}>
                    <Send />
                    <span>{dict.actions.submit}</span>
                  </DropdownMenuItem>
                )}
                {showApprove && (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setOpenDialog("approve");
                    }}
                  >
                    <Check />
                    <span>{dict.actions.approve}</span>
                  </DropdownMenuItem>
                )}
                {showReject && (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setOpenDialog("reject");
                    }}
                    className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                  >
                    <XCircle />
                    <span>{dict.actions.reject}</span>
                  </DropdownMenuItem>
                )}
                {showPost && (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setOpenDialog("post");
                    }}
                  >
                    <Upload />
                    <span>{dict.actions.post}</span>
                  </DropdownMenuItem>
                )}
                {showReactivate && (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setOpenDialog("reactivate");
                    }}
                  >
                    <RotateCcw />
                    <span>{dict.actions.reactivate}</span>
                  </DropdownMenuItem>
                )}

                {/* Destructive */}
                {hasDestructiveActions && <DropdownMenuSeparator />}
                {showCancel && (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setOpenDialog("cancel");
                    }}
                    className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                  >
                    <X />
                    <span>{dict.actions.cancel}</span>
                  </DropdownMenuItem>
                )}
                {showDelete && (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setOpenDialog("delete");
                    }}
                    className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                  >
                    <Trash2 />
                    <span>{dict.actions.delete}</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Dialogs */}
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
      },
    },
    {
      accessorKey: "type",
      header: dict.columns.type,
      cell: ({ row }) => {
        const type = row.getValue("type") as CorrectionKind;
        return (
          <Badge variant={getTypeBadgeVariant(type)} className="text-nowrap">
            {dict.types[type]}
          </Badge>
        );
      },
    },
    {
      accessorKey: "status",
      header: dict.columns.status,
      cell: ({ row }) => {
        const status = row.getValue("status") as CorrectionStatus;
        return (
          <Badge
            variant={getStatusBadgeVariant(status)}
            className="text-nowrap"
          >
            {dict.status[status]}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdBy",
      header: dict.columns.createdBy,
      cell: ({ row }) => {
        const email = row.getValue("createdBy") as string;
        return (
          <div className="whitespace-nowrap">
            {extractNameFromEmail(email)}
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: dict.columns.createdAt,
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as string;
        return <div className="whitespace-nowrap">{formatDateTime(new Date(date))}</div>;
      },
    },
    {
      id: "quarries",
      header: dict.columns.quarry,
      cell: ({ row }) => {
        const items = row.original.items || [];
        const unique = [...new Set(items.map((i) => i.quarry).filter(Boolean))];
        return <div className="whitespace-nowrap">{unique.join(", ")}</div>;
      },
    },
    {
      id: "sourceWarehouses",
      header: dict.columns.sourceWarehouse,
      cell: ({ row }) => (
        <div className="whitespace-nowrap">{row.original.sourceWarehouse}</div>
      ),
    },
    {
      id: "targetWarehouses",
      header: dict.columns.targetWarehouse,
      cell: ({ row }) => (
        <div className="whitespace-nowrap">{row.original.targetWarehouse}</div>
      ),
    },
    {
      accessorKey: "totalValue",
      header: dict.columns.totalValue,
      cell: ({ row }) => {
        const value = row.getValue("totalValue") as number;
        return (
          <div className="font-medium">
            {value?.toFixed(2)} EUR
          </div>
        );
      },
    },
  ];
};
