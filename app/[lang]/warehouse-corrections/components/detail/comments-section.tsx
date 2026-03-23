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
import type { Dictionary } from "../../lib/dict";
import type { CorrectionComment } from "../../lib/types";

interface CommentsSectionProps {
  comments: CorrectionComment[];
  dict: Dictionary;
}

export default function CommentsSection({
  comments,
  dict,
}: CommentsSectionProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{dict.comments.person}</TableHead>
          <TableHead>{dict.comments.date}</TableHead>
          <TableHead>{dict.comments.note}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {comments.length > 0 ? (
          [...comments]
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            )
            .map((comment) => (
              <TableRow key={comment._id?.toString()}>
                <TableCell className="whitespace-nowrap">
                  {extractNameFromEmail(comment.createdBy)}
                </TableCell>
                <TableCell>{formatDateTime(new Date(comment.createdAt))}</TableCell>
                <TableCell className="whitespace-pre-line">
                  {comment.content}
                </TableCell>
              </TableRow>
            ))
        ) : (
          <TableRow>
            <TableCell
              colSpan={3}
              className="text-muted-foreground text-center"
            >
              {dict.detail.noComments}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
