"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LocalizedLink from "@/components/localized-link";
import { extractNameFromEmail } from "@/lib/utils/name-format";
import { formatDateTime } from "@/lib/utils/date-format";
import { ColumnDef } from "@tanstack/react-table";
import {
  ArrowUpDown,
  Edit,
  Eye,
  MoreHorizontal,
  X,
} from "lucide-react";
import { Session } from "next-auth";
import { useState } from "react";
import type { Dictionary } from "../../../lib/dict";
import type { CorrectionDoc, CorrectionKind, CorrectionStatus } from "../../../lib/types";
import CancelCorrectionDialog from "../../dialogs/cancel-correction-dialog";

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

export const createColumns = (
  session: Session | null,
  dict: Dictionary,
  lang?: string,
): ColumnDef<CorrectionDoc>[] => {
  const isAdmin = session?.user?.roles?.includes("admin");
  const userEmail = session?.user?.email;

  return [
    {
      accessorKey: "correctionNumber",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {dict.columns.correctionNumber}
          <ArrowUpDown />
        </Button>
      ),
      cell: ({ row }) => {
        const number = row.getValue("correctionNumber") as string;
        return <div className="font-medium">{number}</div>;
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
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {dict.columns.createdAt}
          <ArrowUpDown />
        </Button>
      ),
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as string;
        return <div className="whitespace-nowrap">{formatDateTime(new Date(date))}</div>;
      },
    },
    {
      accessorKey: "totalValue",
      header: dict.columns.totalValue,
      cell: ({ row }) => {
        const value = row.getValue("totalValue") as number;
        return (
          <div className="text-right font-medium">
            {value?.toFixed(2)} EUR
          </div>
        );
      },
    },
    {
      id: "actions",
      header: dict.columns.actions,
      cell: ({ row }) => {
        const correction = row.original;
        const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

        const canEdit =
          (correction.status === "draft" || correction.status === "rejected") &&
          (correction.createdBy === userEmail || isAdmin);

        const canCancel =
          correction.status === "draft" &&
          (correction.createdBy === userEmail || isAdmin);

        return (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <LocalizedLink
                  href={`/warehouse-corrections/${correction._id}`}
                >
                  <DropdownMenuItem>
                    <Eye />
                    <span>{dict.actions.view}</span>
                  </DropdownMenuItem>
                </LocalizedLink>
                {canEdit && (
                  <LocalizedLink
                    href={`/warehouse-corrections/${correction._id}/edit`}
                  >
                    <DropdownMenuItem>
                      <Edit />
                      <span>{dict.actions.edit}</span>
                    </DropdownMenuItem>
                  </LocalizedLink>
                )}
                {canCancel && (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setIsCancelDialogOpen(true);
                    }}
                    className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                  >
                    <X />
                    <span>{dict.actions.cancel}</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {correction._id && (
              <CancelCorrectionDialog
                isOpen={isCancelDialogOpen}
                onOpenChange={setIsCancelDialogOpen}
                correctionId={correction._id.toString()}
                dict={dict}
              />
            )}
          </>
        );
      },
    },
  ];
};
