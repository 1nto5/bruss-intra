"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DialogFormActions,
  DialogFormContent,
} from "@/components/ui/dialog-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { MessageSquare } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { addComment } from "../../actions/comments";
import type { Dictionary } from "../../lib/dict";
import { createCommentSchema } from "../../lib/zod";
import type * as z from "zod";

interface AddCommentDialogProps {
  correctionId: string;
  dict: Dictionary;
  lang: string;
}

export default function AddCommentDialog({
  correctionId,
  dict,
  lang,
}: AddCommentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const commentSchema = createCommentSchema(dict.validation);

  const form = useForm<z.infer<typeof commentSchema>>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      content: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof commentSchema>) => {
    setIsSubmitting(true);
    setOpen(false);

    toast.promise(
      new Promise<void>(async (resolve, reject) => {
        try {
          const result = await addComment(
            correctionId,
            data.content,
            lang as "pl" | "de" | "en",
          );

          if ("success" in result) {
            form.reset();
            resolve();
          } else {
            reject(new Error(dict.errors.contactIT));
          }
        } catch {
          reject(new Error(dict.errors.contactIT));
        } finally {
          setIsSubmitting(false);
        }
      }),
      {
        loading: dict.toast.addingComment,
        success: dict.toast.commentAdded,
        error: (err) => err.message,
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <MessageSquare />
          {dict.comments.addComment}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{dict.comments.dialogTitle}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogFormContent>
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="content">
                      {dict.comments.contentLabel}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        id="content"
                        placeholder={dict.comments.placeholder}
                        className="h-32"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </DialogFormContent>
            <DialogFormActions
              onCancel={() => setOpen(false)}
              isPending={isSubmitting}
              cancelLabel={dict.actions.cancel}
              submitLabel={dict.comments.addComment}
              submitIcon={<MessageSquare />}
            />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
