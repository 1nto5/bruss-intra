"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { CircleX } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { rejectCorrection } from "../../actions/approval";
import type { Dictionary } from "../../lib/dict";
import { createRejectSchema } from "../../lib/zod";

interface RejectDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  correctionId: string;
  dict: Dictionary;
}

export default function RejectDialog({
  isOpen,
  onOpenChange,
  correctionId,
  dict,
}: RejectDialogProps) {
  const rejectSchema = createRejectSchema(dict.validation);

  const form = useForm<z.infer<typeof rejectSchema>>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { rejectionReason: "" },
  });

  const handleOpenChange = (open: boolean) => {
    if (!open) form.reset();
    onOpenChange(open);
  };

  const onSubmit = async (data: z.infer<typeof rejectSchema>) => {
    onOpenChange(false);
    form.reset();
    toast.promise(
      rejectCorrection(correctionId, data.rejectionReason).then((res) => {
        if ("error" in res) throw new Error(res.error);
        return res;
      }),
      {
        loading: dict.toast.rejecting,
        success: dict.toast.rejected,
        error: (error) => {
          const errorMsg = error.message;
          if (errorMsg === "unauthorized") return dict.errors.unauthorized;
          console.error("handleReject", errorMsg);
          return dict.errors.contactIT;
        },
      },
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{dict.dialogs.reject.title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-2 px-6 py-4">
              <FormField
                control={form.control}
                name="rejectionReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.dialogs.reject.reasonLabel}</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="pt-4">
              <Button variant="destructive" type="submit">
                <CircleX />
                {dict.dialogs.reject.buttonText}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
