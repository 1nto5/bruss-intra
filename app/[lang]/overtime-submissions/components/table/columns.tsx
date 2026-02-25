"use client";

import LocalizedLink from "@/components/localized-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Locale } from "@/lib/config/i18n";
import { formatDateWithDay } from "@/lib/utils/date-format";
import { extractNameFromEmail } from "@/lib/utils/name-format";
import { ColumnDef } from "@tanstack/react-table";
import { Calendar, Check, Eye, MoreHorizontal, Pencil, X } from "lucide-react";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Session } from "next-auth";
import { Dictionary } from "../../lib/dict";
import { OvertimeSubmissionType } from "../../lib/types";

// Creating a columns factory function that takes the session, dict and lang
export const createColumns = (
  session: Session | null,
  dict: Dictionary,
  lang: Locale,
): ColumnDef<OvertimeSubmissionType>[] => {
  return [
    {
      accessorKey: "internalId",
      header: "ID",
      cell: ({ row }) => {
        const internalId = row.getValue("internalId") as string;
        return <span>{internalId || "-"}</span>;
      },
    },
    {
      accessorKey: "status",
      header: dict.columns.status,
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        let statusLabel;

        switch (status) {
          case "pending":
            statusLabel = (
              <Badge variant="statusPending" className="text-nowrap">
                {dict.status.pending}
              </Badge>
            );
            break;
          case "pending-plant-manager":
            statusLabel = (
              <Badge variant="statusPending" className="text-nowrap">
                {dict.status.pendingPlantManager || "Pending - Plant Manager"}
              </Badge>
            );
            break;
          case "approved":
            statusLabel = (
              <Badge variant="statusApproved">{dict.status.approved}</Badge>
            );
            break;
          case "rejected":
            statusLabel = (
              <Badge variant="statusRejected">{dict.status.rejected}</Badge>
            );
            break;
          case "accounted":
            statusLabel = (
              <Badge variant="statusAccounted">{dict.status.accounted}</Badge>
            );
            break;
          case "cancelled":
            statusLabel = (
              <Badge variant="statusCancelled">{dict.status.cancelled}</Badge>
            );
            break;
          default:
            statusLabel = <Badge variant="outline">{status}</Badge>;
        }

        return statusLabel;
      },
    },
    {
      id: "actions",
      header: dict.columns?.actions || "Actions",
      cell: ({ row, table }) => {
        const submission = row.original;
        const status = submission.status;
        const meta = table.options.meta as any;
        const onCancelClick = meta?.onCancelClick;
        const onApproveClick = meta?.onApproveClick;
        const onRejectClick = meta?.onRejectClick;
        const onMarkAccountedClick = meta?.onMarkAccountedClick;
        const onCorrectionClick = meta?.onCorrectionClick;
        const returnUrl = meta?.returnUrl;

        // User info from session
        const userEmail = session?.user?.email ?? "";
        const userRoles = session?.user?.roles ?? [];
        const isAdmin = userRoles.includes("admin");
        const isHR = userRoles.includes("hr");
        const isPlantManager = userRoles.includes("plant-manager");
        const isSupervisor = submission.supervisor === userEmail;

        // Permission checks
        // Approve/Reject: supervisor or admin for pending, plant-manager or admin for pending-plant-manager
        const canApprove =
          (status === "pending" && (isSupervisor || isAdmin)) ||
          (status === "pending-plant-manager" && (isPlantManager || isAdmin));
        const canReject = canApprove;

        // Cancel: pending or pending-plant-manager status
        const canCancel = status === "pending" || status === "pending-plant-manager";

        // Correction permissions match server-side logic:
        // - Supervisor: pending, pending-plant-manager
        // - HR: pending, pending-plant-manager, approved
        // - Admin: all except accounted
        const canCorrect =
          (isSupervisor && (status === "pending" || status === "pending-plant-manager")) ||
          (isHR && ["pending", "pending-plant-manager", "approved"].includes(status)) ||
          (isAdmin && status !== "accounted");

        // Mark as Accounted: approved status and HR or admin
        const canMarkAccounted = status === "approved" && (isHR || isAdmin);

        // Build detail URL with returnUrl param if available
        const detailUrl = returnUrl
          ? `/overtime-submissions/${submission._id}?returnUrl=${encodeURIComponent(returnUrl)}`
          : `/overtime-submissions/${submission._id}`;

        // Check if any action besides view details is available
        const hasActions = canApprove || canReject || canCancel || canCorrect || canMarkAccounted;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <LocalizedLink href={detailUrl}>
                <DropdownMenuItem>
                  <Eye />
                  {dict.actions?.viewDetails || "View details"}
                </DropdownMenuItem>
              </LocalizedLink>

              {hasActions && <DropdownMenuSeparator />}

              {canApprove && onApproveClick && (
                <DropdownMenuItem onClick={() => onApproveClick(submission._id)}>
                  <Check />
                  {dict.actions?.approve || "Approve"}
                </DropdownMenuItem>
              )}

              {canCorrect && onCorrectionClick && (
                <DropdownMenuItem onClick={() => onCorrectionClick(submission._id)}>
                  <Pencil />
                  {dict.actions?.correct || "Correction"}
                </DropdownMenuItem>
              )}

              {canMarkAccounted && onMarkAccountedClick && (
                <DropdownMenuItem onClick={() => onMarkAccountedClick(submission._id)}>
                  <Calendar />
                  {dict.actions?.markAsAccounted || "Mark as Accounted"}
                </DropdownMenuItem>
              )}

              {canReject && onRejectClick && (
                <DropdownMenuItem
                  onClick={() => onRejectClick(submission._id)}
                  className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                >
                  <X />
                  {dict.actions?.reject || "Reject"}
                </DropdownMenuItem>
              )}

              {canCancel && onCancelClick && (
                <DropdownMenuItem
                  onClick={() => onCancelClick(submission._id)}
                  className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                >
                  <X />
                  {dict.actions?.cancelSubmission || "Cancel"}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
    {
      accessorKey: "supervisor",
      header: dict.columns.supervisor,
      cell: ({ row }) => {
        const email = row.getValue("supervisor") as string;
        return (
          <span className="whitespace-nowrap">
            {extractNameFromEmail(email)}
          </span>
        );
      },
    },
    {
      accessorKey: "date",
      header: dict.columns.date,
      cell: ({ row }) => {
        const submission = row.original;
        // Show "Payout Request" label for payout requests instead of date
        if (submission.payoutRequest) {
          return (
            <Badge variant="secondary" className="whitespace-nowrap">
              {dict.payoutRequest?.title || "Payout Request"}
            </Badge>
          );
        }
        const date = row.getValue("date") as string;
        return <span>{formatDateWithDay(date, lang)}</span>;
      },
    },
    {
      accessorKey: "hours",
      header: dict.columns.hours,
      cell: ({ row }) => {
        const hours = row.getValue("hours") as number;
        return (
          <span className={hours < 0 ? "text-red-600 dark:text-red-400" : ""}>
            {hours}h
          </span>
        );
      },
    },
    {
      accessorKey: "reason",
      header: dict.columns.reason,
      cell: ({ row }) => {
        const reason = row.getValue("reason") as string | undefined;
        if (!reason) return <div className="max-w-[200px]">-</div>;
        const truncated =
          reason.length > 80 ? `${reason.substring(0, 80)}...` : reason;
        return <div className="max-w-[200px]">{truncated}</div>;
      },
    },
  ];
};
