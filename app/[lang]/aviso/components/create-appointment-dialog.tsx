"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { DialogFormActions } from "@/components/ui/dialog-form";
import DialogScrollArea from "@/components/dialog-scroll-area";
import DialogFormWithScroll from "@/components/dialog-form-with-scroll";
import { toast } from "sonner";
import { Save } from "lucide-react";
import AppointmentFormFields from "./appointment-form-fields";
import { createAppointment } from "../actions";
import { appointmentSchema, type AppointmentFormData } from "../lib/zod";
import { formatDateYmd } from "../lib/time-utils";
import type { Dictionary } from "../lib/dict";

interface CreateAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dict: Dictionary;
  defaultDate?: string;
  onCreated: () => void;
}

const DEFAULT_VALUES: AppointmentFormData = {
  plate: "",
  date: "",
  window_start: "06:00",
  window_end: "07:00",
  op_loading: false,
  op_unloading: false,
  driver_name: "",
  company_name: "",
  carrier_name: "",
  driver_phone: "",
  company_phone: "",
  comment: "",
};

export default function CreateAppointmentDialog({
  open,
  onOpenChange,
  dict,
  defaultDate,
  onCreated,
}: CreateAppointmentDialogProps) {
  const [isPending, setIsPending] = useState(false);

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      ...DEFAULT_VALUES,
      date: defaultDate ?? formatDateYmd(new Date()),
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        ...DEFAULT_VALUES,
        date: defaultDate ?? formatDateYmd(new Date()),
      });
    }
  }, [open]);

  const onSubmit = async (data: AppointmentFormData) => {
    setIsPending(true);
    try {
      const result = await createAppointment(data);
      if ("success" in result) {
        toast.success(dict.toast.created);
        onOpenChange(false);
        onCreated();
      } else if ("error" in result) {
        console.error("onSubmit", result.error);
        if (result.error === "unauthorized") {
          toast.error(dict.errors.unauthorized);
        } else {
          toast.error(dict.errors.contactIT);
        }
      }
    } catch (error) {
      console.error("onSubmit", error);
      toast.error(dict.errors.contactIT);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{dict.form.create}</DialogTitle>
          <DialogDescription />
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogScrollArea>
              <DialogFormWithScroll>
                <AppointmentFormFields dict={dict} modal />
                {form.formState.errors.root && (
                  <p className="text-destructive text-sm font-medium">
                    {form.formState.errors.root.message}
                  </p>
                )}
              </DialogFormWithScroll>
            </DialogScrollArea>
            <DialogFormActions
              onCancel={() => onOpenChange(false)}
              isPending={isPending}
              cancelLabel={dict.form.cancel}
              submitLabel={dict.form.save}
              submitIcon={<Save />}
            />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
