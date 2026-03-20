"use client";
import { createAddCorrectiveActionSchema } from "@/app/[lang]/deviations/lib/zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClearableCombobox } from "@/components/clearable-combobox";
import { DateTimeInput } from "@/components/ui/datetime-input";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { UsersListType } from "@/lib/types/user";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftToLine, Eraser, Loader, Plus } from "lucide-react";
import { useState } from "react";
import LocalizedLink from "@/components/localized-link";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { redirectToDeviation, updateCorrectiveAction } from "../actions";
import { Dictionary } from "../lib/dict";
import { Locale } from "@/lib/config/i18n";

type AddCorrectiveActionPropsType = {
  id: string;
  users: UsersListType;
  dict: Dictionary;
  lang: Locale;
};

export default function AddCorrectiveActionForm({
  id,
  users,
  dict,
  lang,
}: AddCorrectiveActionPropsType) {
  // const [isDraft, setIsDraft] = useState<boolean>();
  const [isPendingUpdate, setIsPendingUpdating] = useState<boolean>(false);
  const addCorrectiveActionSchema = createAddCorrectiveActionSchema(
    dict.correctiveAction.validation,
  );

  const form = useForm<z.infer<typeof addCorrectiveActionSchema>>({
    resolver: zodResolver(addCorrectiveActionSchema),
    defaultValues: {
      description: "",
      responsible: undefined,
      deadline: undefined,
    },
  });

  const onSubmit = async (data: z.infer<typeof addCorrectiveActionSchema>) => {
    // console.log('onSubmit', data);
    setIsPendingUpdating(true);
    try {
      const res = await updateCorrectiveAction(id, data);
      if (res.success) {
        toast.success(dict.correctiveAction.toasts.added);
        // form.reset()
        redirectToDeviation(id, lang);
      } else if (res.error === "not found") {
        toast.error(dict.correctiveAction.errors.deviationNotFound);
      } else if (res.error === "not authorized") {
        toast.error(dict.correctiveAction.errors.notAuthorized);
      } else if (res.error) {
        console.error(res.error);
        toast.error(dict.form.contactIT);
      }
    } catch (error) {
      console.error("onSubmit", error);
      toast.error(dict.form.contactIT);
    } finally {
      setIsPendingUpdating(false);
    }
  };

  return (
    <Card className="w-[768px]">
      <CardHeader>
        <div className="space-y-2 sm:flex sm:justify-between sm:gap-4">
          <CardTitle>{dict.correctiveAction.title}</CardTitle>
          <LocalizedLink href={`/deviations/${id}`}>
            <Button variant="outline">
              <ArrowLeftToLine /> {dict.form.deviationLink}
            </Button>
          </LocalizedLink>
        </div>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* <form
          onSubmit={form.handleSubmit(isDraft ? handleDraftInsert : onSubmit)}
        > */}
          <CardContent className="grid w-full items-center gap-4">
            <FormField
              control={form.control}
              name="deadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.correctiveAction.deadline}</FormLabel>
                  <FormControl>
                    <DateTimePicker
                      modal
                      hideTime
                      value={field.value}
                      onChange={field.onChange}
                      min={(() => {
                        const today = new Date();
                        const minDate = new Date(today);
                        minDate.setDate(today.getDate() + 1);
                        return minDate;
                      })()}
                      max={(() => {
                        const today = new Date();
                        const maxDate = new Date(today);
                        maxDate.setDate(today.getDate() + 90);
                        return maxDate;
                      })()}
                      timePicker={{ hour: false, minute: false }}
                      renderTrigger={({ open, value, setOpen }) => (
                        <DateTimeInput
                          value={value}
                          onChange={(x) => !open && field.onChange(x)}
                          format="dd/MM/yyyy"
                          disabled={open}
                          onCalendarClick={() => setOpen(!open)}
                        />
                      )}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="responsible"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.correctiveAction.responsible}</FormLabel>
                  <ClearableCombobox
                    value={field.value}
                    onValueChange={field.onChange}
                    options={users.map((u) => ({ value: u.email, label: u.name }))}
                    className="w-full"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.correctiveAction.description}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={dict.correctiveAction.descriptionPlaceholder}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button
              variant="destructive"
              type="button"
              onClick={() => form.reset()}
            >
              <Eraser />
              {dict.filters.clear}
            </Button>
            <div className="flex space-x-2">
              <Button type="submit">
                {isPendingUpdate ? (
                  <Loader className="animate-spin" />
                ) : (
                  <Plus />
                )}
                {dict.correctiveAction.addButton}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
