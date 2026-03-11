import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { extractNameFromEmail } from "@/lib/utils/name-format";
import { formatDateTime } from "@/lib/utils/date-format";
import { Dictionary } from "../lib/dict";
import { PrintLogType } from "../lib/types";

interface PrintLogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  logs: PrintLogType[];
  dict: Dictionary;
}

export default function PrintLogDialog({
  isOpen,
  onClose,
  logs,
  dict,
}: PrintLogDialogProps) {
  // Sort logs in reverse chronological order
  const sortedLogs = [...logs].sort((a, b) => {
    const dateA = new Date(a.printedAt).getTime();
    const dateB = new Date(b.printedAt).getTime();
    return dateB - dateA; // Most recent first
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{dict.dialogs.printLog.title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-96">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{dict.dialogs.printLog.columns.date}</TableHead>
                <TableHead>{dict.dialogs.printLog.columns.person}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedLogs.length > 0 ? (
                sortedLogs.map((log, index) => (
                  <TableRow key={index}>
                    <TableCell>{formatDateTime(log.printedAt)}</TableCell>
                    <TableCell>{extractNameFromEmail(log.printedBy)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="text-muted-foreground text-center"
                  >
                    {dict.dialogs.printLog.noPrints}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
