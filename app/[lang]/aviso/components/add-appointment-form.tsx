"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { createAppointment } from "../actions";
import { appointmentSchema, type AppointmentFormData } from "../lib/zod";
import { formatDateYmd } from "../lib/time-utils";
import AppointmentFormFields from "./appointment-form-fields";
import type { Dictionary } from "../lib/dict";
import type { Locale } from "@/lib/config/i18n";

interface AddAppointmentFormProps {
  dict: Dictionary;
  lang: Locale;
  defaultDate?: string;
}

export default function AddAppointmentForm({
  dict,
  lang,
  defaultDate,
}: AddAppointmentFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      plate: "",
      date: defaultDate ?? formatDateYmd(new Date()),
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
    },
  });

  const onSubmit = async (data: AppointmentFormData) => {
    setIsPending(true);
    try {
      const result = await createAppointment(data);
      if ("success" in result) {
        toast.success(dict.toast.created);
        router.push(`/${lang}/aviso?date=${data.date}`);
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
    <Card className="sm:w-[768px]">
      <CardHeader>
        <CardTitle>{dict.form.create}</CardTitle>
      </CardHeader>
      <Separator />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4 pt-6">
            <AppointmentFormFields dict={dict} />
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isPending}
            >
              {dict.form.cancel}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader className="animate-spin" /> : <Save />}
              {dict.form.save}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
