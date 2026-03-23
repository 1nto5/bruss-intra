"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DialogFormActions,
  DialogFormContent,
} from "@/components/ui/dialog-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { importArticles } from "../../actions/import";
import type { Dictionary } from "../../lib/dict";

export default function ImportArticlesDialog({ dict }: { dict: Dictionary }) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx")) {
      toast.error(dict.errors.invalidFileType);
      return;
    }

    setOpen(false);

    const formData = new FormData();
    formData.append("file", file);

    toast.promise(
      (async () => {
        setIsPending(true);
        try {
          const result = await importArticles(formData);
          if ("error" in result) {
            const errorKey = result.error as keyof typeof dict.errors;
            throw new Error(dict.errors[errorKey] ?? dict.errors.contactIT);
          }
          return result;
        } finally {
          setIsPending(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      })(),
      {
        loading: dict.toast.importingArticles,
        success: (data) =>
          `${dict.toast.articlesImported}: ${data.total} (${data.inserted} + ${data.updated})`,
        error: (err) => err.message,
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto">
          <Upload />
          <span>{dict.dialogs.importArticles.triggerButton}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{dict.dialogs.importArticles.title}</DialogTitle>
          <DialogDescription>
            {dict.dialogs.importArticles.description}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogFormContent>
            <div className="space-y-2">
              <Label htmlFor="sap-file">
                {dict.dialogs.importArticles.fileLabel}
              </Label>
              <Input
                id="sap-file"
                type="file"
                accept=".xlsx"
                ref={fileInputRef}
              />
            </div>
          </DialogFormContent>
          <DialogFormActions
            onCancel={() => setOpen(false)}
            isPending={isPending}
            cancelLabel={dict.common.cancel}
            submitLabel={dict.dialogs.importArticles.submitButton}
            submitIcon={<Upload />}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
