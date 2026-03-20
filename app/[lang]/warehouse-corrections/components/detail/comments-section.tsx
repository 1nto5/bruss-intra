"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { extractNameFromEmail } from "@/lib/utils/name-format";
import { formatDateTime } from "@/lib/utils/date-format";
import { Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { addComment } from "../../actions/comments";
import type { Dictionary } from "../../lib/dict";
import type { CorrectionComment, CorrectionStatus } from "../../lib/types";

interface CommentsSectionProps {
  correctionId: string;
  comments: CorrectionComment[];
  correctionStatus: CorrectionStatus;
  dict: Dictionary;
  lang: string;
}

export default function CommentsSection({
  correctionId,
  comments,
  correctionStatus,
  dict,
  lang,
}: CommentsSectionProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canComment = correctionStatus !== "cancelled";

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await addComment(correctionId, content, lang as "pl" | "de" | "en");
      if ("success" in res) {
        toast.success(dict.toast.commentAdded);
        setContent("");
      } else {
        toast.error(dict.errors.contactIT);
      }
    } catch {
      toast.error(dict.errors.contactIT);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {dict.detail.noComments}
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div
              key={comment._id?.toString()}
              className="rounded-md border p-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {extractNameFromEmail(comment.createdBy)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(new Date(comment.createdAt))}
                </p>
              </div>
              <p className="mt-1 text-sm whitespace-pre-line">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {canComment && (
        <div className="flex gap-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={dict.comments.placeholder}
            rows={2}
            className="resize-none"
          />
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !content.trim()}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
