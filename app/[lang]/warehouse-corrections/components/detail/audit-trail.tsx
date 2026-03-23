"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { extractNameFromEmail } from "@/lib/utils/name-format";
import { formatDateTime } from "@/lib/utils/date-format";
import {
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Edit,
  FileText,
  MessageSquare,
  RotateCcw,
  Send,
  Trash2,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import type { Dictionary } from "../../lib/dict";
import type { AuditLogEntry } from "../../lib/types";

interface AuditTrailProps {
  auditLog: AuditLogEntry[];
  dict: Dictionary;
}

const STATUS_ACTIONS = new Set([
  "created",
  "submitted",
  "resubmitted",
  "approved",
  "rejected",
  "posted",
  "cancelled",
  "deleted",
  "reactivated",
]);

function getAuditBadgeVariant(action: AuditLogEntry["action"]) {
  switch (action) {
    case "created":
    case "reactivated":
      return "outline" as const;
    case "submitted":
    case "resubmitted":
      return "statusPending" as const;
    case "approved":
      return "statusApproved" as const;
    case "rejected":
      return "statusRejected" as const;
    case "posted":
    case "cancelled":
      return "statusClosed" as const;
    case "deleted":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

type FieldChange = {
  field: string;
  old?: unknown;
  new?: unknown;
};

function getActionIcon(action: string) {
  switch (action) {
    case "created":
      return <FileText className="h-4 w-4 text-blue-500" />;
    case "edited":
      return <Edit className="h-4 w-4 text-orange-500" />;
    case "submitted":
    case "resubmitted":
      return <Send className="h-4 w-4 text-blue-500" />;
    case "approved":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "rejected":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "commented":
      return <MessageSquare className="h-4 w-4 text-gray-500" />;
    case "posted":
      return <Upload className="h-4 w-4 text-purple-500" />;
    case "cancelled":
      return <X className="h-4 w-4 text-red-500" />;
    case "deleted":
      return <Trash2 className="h-4 w-4 text-red-500" />;
    case "reactivated":
      return <RotateCcw className="h-4 w-4 text-blue-500" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

function translateField(field: string, dict: Dictionary): string {
  const fieldNames = dict.editDetails?.fieldNames as
    | Record<string, string>
    | undefined;
  if (!fieldNames) return field;

  // Header field: e.g. "type"
  if (fieldNames[field]) return fieldNames[field];

  // Item field: e.g. "items[0].quantity" -> extract index and field name
  const itemMatch = field.match(/^items\[(\d+)\]\.(\w+)$/);
  if (itemMatch) {
    const idx = Number(itemMatch[1]) + 1;
    const subField = itemMatch[2];
    const translated = fieldNames[subField] || subField;
    return `#${idx} - ${translated}`;
  }

  // Item added/removed: e.g. "items[2]"
  const itemIdxMatch = field.match(/^items\[(\d+)\]$/);
  if (itemIdxMatch) {
    return `#${Number(itemIdxMatch[1]) + 1}`;
  }

  return field;
}

function EditChanges({
  changes,
  dict,
}: {
  changes: FieldChange[];
  dict: Dictionary;
}) {
  const [open, setOpen] = useState(false);
  const ed = dict.editDetails;

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        {open ? ed?.hideChanges : ed?.showChanges} ({changes.length})
      </button>
      {open && (
        <table className="mt-1.5 w-full text-xs">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-1 pr-2 font-medium">{ed?.field}</th>
              <th className="pb-1 pr-2 font-medium">{ed?.oldValue}</th>
              <th className="pb-1 font-medium">{ed?.newValue}</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((change, i) => {
              const isAdded =
                change.new === "added" && change.old === undefined;
              const isRemoved =
                change.old === "removed" && change.new === undefined;

              return (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-1 pr-2 font-medium">
                    {translateField(change.field, dict)}
                  </td>
                  <td className="py-1 pr-2">
                    {isRemoved ? (
                      <span className="text-red-600">{ed?.itemRemoved}</span>
                    ) : isAdded ? (
                      "-"
                    ) : (
                      <span className="text-red-600">
                        {String(change.old || "-")}
                      </span>
                    )}
                  </td>
                  <td className="py-1">
                    {isAdded ? (
                      <span className="text-green-600">{ed?.itemAdded}</span>
                    ) : isRemoved ? (
                      "-"
                    ) : (
                      <span className="text-green-600">
                        {String(change.new || "-")}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function AuditTrail({ auditLog, dict }: AuditTrailProps) {
  if (!auditLog || auditLog.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {dict.detail.noAuditLog}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {auditLog.map((entry) => {
        const changes =
          entry.action === "edited" && entry.details?.changes
            ? (entry.details.changes as FieldChange[])
            : null;

        return (
          <div
            key={entry._id?.toString()}
            className="flex items-start gap-3 rounded-md border p-3"
          >
            <div className="mt-0.5">{getActionIcon(entry.action)}</div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                {STATUS_ACTIONS.has(entry.action) ? (
                  <Badge variant={getAuditBadgeVariant(entry.action)}>
                    {dict.auditActions[
                      entry.action as keyof typeof dict.auditActions
                    ] || entry.action}
                  </Badge>
                ) : (
                  dict.auditActions[
                    entry.action as keyof typeof dict.auditActions
                  ] || entry.action
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {extractNameFromEmail(entry.performedBy)} -{" "}
                {formatDateTime(new Date(entry.performedAt))}
              </p>
              {changes && changes.length > 0 ? (
                <EditChanges changes={changes} dict={dict} />
              ) : (
                entry.details &&
                Object.keys(entry.details).length > 0 &&
                !entry.details.changes && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {JSON.stringify(entry.details)}
                  </p>
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
