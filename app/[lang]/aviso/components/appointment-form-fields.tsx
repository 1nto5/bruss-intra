"use client";

import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { DateTimeInput } from "@/components/ui/datetime-input";
import type { AppointmentFormData } from "../lib/zod";
import {
  formatDateYmd,
  formatTimeHm,
  parseDateTimeLocal,
} from "../lib/time-utils";
import type { Dictionary } from "../lib/dict";

interface AppointmentFormFieldsProps {
  dict: Dictionary;
  modal?: boolean;
}

export default function AppointmentFormFields({
  dict,
  modal,
}: AppointmentFormFieldsProps) {
  const form = useFormContext<AppointmentFormData>();

  const currentDate = form.watch("date");
  const currentStart = form.watch("window_start");
  const currentEnd = form.watch("window_end");

  const startValue =
    currentDate && currentStart
      ? (parseDateTimeLocal(currentDate, currentStart) ?? undefined)
      : undefined;
  const endValue =
    currentDate && currentEnd
      ? (parseDateTimeLocal(currentDate, currentEnd) ?? undefined)
      : undefined;

  return (
    <>
      <FormField
        control={form.control}
        name="plate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{dict.form.plate}</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="window_start"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.form.windowStart}</FormLabel>
              <FormControl>
                <DateTimePicker
                  value={startValue}
                  onChange={(d) => {
                    if (d) {
                      form.setValue("date", formatDateYmd(d));
                      field.onChange(formatTimeHm(d));
                    }
                  }}
                  timePicker={{
                    hour: true,
                    minute: true,
                    second: false,
                  }}
                  modal={modal}
                  renderTrigger={({ value, setOpen, open }) => (
                    <DateTimeInput
                      value={value}
                      onChange={(d) => {
                        if (d) {
                          form.setValue("date", formatDateYmd(d));
                          field.onChange(formatTimeHm(d));
                        }
                      }}
                      format="dd/MM/yyyy HH:mm"
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
          name="window_end"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.form.windowEnd}</FormLabel>
              <FormControl>
                <DateTimePicker
                  value={endValue}
                  onChange={(d) => {
                    if (d) {
                      form.setValue("date", formatDateYmd(d));
                      field.onChange(formatTimeHm(d));
                    }
                  }}
                  timePicker={{
                    hour: true,
                    minute: true,
                    second: false,
                  }}
                  modal={modal}
                  renderTrigger={({ value, setOpen, open }) => (
                    <DateTimeInput
                      value={value}
                      onChange={(d) => {
                        if (d) {
                          form.setValue("date", formatDateYmd(d));
                          field.onChange(formatTimeHm(d));
                        }
                      }}
                      format="dd/MM/yyyy HH:mm"
                      onCalendarClick={() => setOpen(!open)}
                    />
                  )}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="flex gap-6">
        <FormField
          control={form.control}
          name="op_loading"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="cursor-pointer">
                {dict.form.opLoading}
              </FormLabel>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="op_unloading"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="cursor-pointer">
                {dict.form.opUnloading}
              </FormLabel>
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="driver_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.form.driverName}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="driver_phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.form.driverPhone}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="company_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.form.companyName}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="company_phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.form.companyPhone}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="carrier_name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{dict.form.carrierName}</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="comment"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{dict.form.comment}</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
