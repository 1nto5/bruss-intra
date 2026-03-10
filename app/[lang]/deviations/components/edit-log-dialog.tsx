"use client";

import { EditLogEntryType } from "@/app/[lang]/deviations/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { extractNameFromEmail } from "@/lib/utils/name-format";
import { formatDate, formatDateTime } from "@/lib/utils/date-format";
import { Dictionary } from "../lib/dict";

// Helper to format values for display
const formatValue = (value: any, dict: Dictionary): string => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean")
    return value
      ? dict.dialogs.editLog.booleanValues.true
      : dict.dialogs.editLog.booleanValues.false;

  // Handle Date objects
  if (value instanceof Date) return formatDate(value);

  // Handle date strings - try to detect date format
  if (typeof value === "string") {
    // Check if it's a date string (ISO format)
    if (/^\d{4}-\d{2}-\d{2}(T|\s)\d{2}:\d{2}/.test(value)) {
      try {
        const date = new Date(value);
        // Validate that it's a valid date
        if (!isNaN(date.getTime())) {
          return formatDate(date);
        }
      } catch {
        // Fall through to default handling
      }
    }
  }

  // Special handling for date objects that might not be instanceof Date
  if (
    typeof value === "object" &&
    value !== null &&
    "getMonth" in value &&
    typeof value.getMonth === "function"
  ) {
    try {
      return formatDate(value);
    } catch {
      // Fall through to default handling
    }
  }

  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export default function EditLogDialog({
  isOpen,
  onClose,
  logs,
  dict,
}: {
  isOpen: boolean;
  onClose: () => void;
  logs: EditLogEntryType[];
  dict: Dictionary;
}) {
  // Sort logs by date descending
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime(),
  );

  const fieldNameTranslations = dict.dialogs.editLog.fieldNames as Record<
    string,
    string
  >;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[768px]">
        <DialogHeader>
          <DialogTitle>{dict.dialogs.editLog.title}</DialogTitle>
          {/* <DialogDescription>
            Lista zmian wprowadzonych w polach odchylenia.
            </DialogDescription> */}
        </DialogHeader>
        {/* <ScrollArea className='h-[300px]'> */}
        <div className="h-[300px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{dict.dialogs.editLog.columns.date}</TableHead>
                <TableHead>{dict.dialogs.editLog.columns.person}</TableHead>
                <TableHead>{dict.dialogs.editLog.columns.field}</TableHead>
                <TableHead>{dict.dialogs.editLog.columns.oldValue}</TableHead>
                <TableHead>{dict.dialogs.editLog.columns.newValue}</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sortedLogs.length > 0 ? (
                sortedLogs.map((log, index) => (
                  <TableRow key={index}>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(log.changedAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {extractNameFromEmail(log.changedBy)}
                    </TableCell>
                    <TableCell>
                      {fieldNameTranslations[log.fieldName] || log.fieldName}
                    </TableCell>
                    <TableCell>{formatValue(log.oldValue, dict)}</TableCell>
                    <TableCell>{formatValue(log.newValue, dict)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-muted-foreground text-center"
                  >
                    {dict.dialogs.editLog.noHistory}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {/* </ScrollArea> */}
        {/* <DialogFooter>
          <Button variant='outline' onClick={onClose}>
          Zamknij
          </Button>
          </DialogFooter> */}
      </DialogContent>
    </Dialog>
  );
}
