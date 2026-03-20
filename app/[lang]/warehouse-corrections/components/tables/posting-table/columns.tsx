"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import LocalizedLink from "@/components/localized-link";
import { extractNameFromEmail } from "@/lib/utils/name-format";
import { formatDateTime } from "@/lib/utils/date-format";
import { ColumnDef } from "@tanstack/react-table";
import { Eye, Upload } from "lucide-react";
import { Session } from "next-auth";
import { useState } from "react";
import type { Dictionary } from "../../../lib/dict";
import type { CorrectionDoc, CorrectionKind } from "../../../lib/types";
import PostDialog from "../../dialogs/post-dialog";

export const createPostingColumns = (
  session: Session | null,
  dict: Dictionary,
  lang?: string,
): ColumnDef<CorrectionDoc>[] => {
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
          {dict.types[row.getValue("type") as CorrectionKind]}
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
      accessorKey: "totalValue",
      header: dict.columns.totalValue,
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {(row.getValue("totalValue") as number)?.toFixed(2)} EUR
        </div>
      ),
    },
    {
      id: "actions",
      header: dict.columns.actions,
      cell: ({ row }) => {
        const correction = row.original;
        const [isPostOpen, setIsPostOpen] = useState(false);

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
              className="text-purple-600"
              onClick={() => setIsPostOpen(true)}
            >
              <Upload className="h-4 w-4" />
            </Button>

            <PostDialog
              isOpen={isPostOpen}
              onOpenChange={setIsPostOpen}
              correctionId={correction._id.toString()}
              dict={dict}
            />
          </div>
        );
      },
    },
  ];
};
