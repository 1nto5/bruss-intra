"use client";

import { useState, useEffect, useRef } from "react";
import { useFormContext, useFieldArray, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { DateTimeInput } from "@/components/ui/datetime-input";
import { X } from "lucide-react";
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

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);
  const appendingRef = useRef(false);

  const emptyItem = { article_number: "", quantity: "", transfer_order: "" };

  const isRowEmpty = (row: { article_number?: string; quantity?: string; transfer_order?: string }) =>
    !row?.article_number && !row?.quantity && !row?.transfer_order;

  const watchedItems = useWatch({ control: form.control, name: "items" });

  // Ensure at least one empty row exists, and auto-append when last row is filled
  useEffect(() => {
    if (appendingRef.current) return;
    if (!watchedItems || watchedItems.length === 0) {
      appendingRef.current = true;
      append(emptyItem, { shouldFocus: false });
      requestAnimationFrame(() => { appendingRef.current = false; });
      return;
    }
    const last = watchedItems[watchedItems.length - 1];
    if (last?.article_number) {
      appendingRef.current = true;
      append(emptyItem, { shouldFocus: false });
      requestAnimationFrame(() => { appendingRef.current = false; });
    }
  }, [watchedItems, append]);

  // Clean up multiple trailing empty rows - keep only one
  useEffect(() => {
    if (!watchedItems || watchedItems.length < 2) return;
    let trailingEmpties = 0;
    for (let i = watchedItems.length - 1; i >= 0; i--) {
      if (isRowEmpty(watchedItems[i])) trailingEmpties++;
      else break;
    }
    if (trailingEmpties > 1) {
      const indicesToRemove: number[] = [];
      for (let i = 0; i < trailingEmpties - 1; i++) {
        indicesToRemove.push(watchedItems.length - 1 - i);
      }
      // Remove from highest index first to avoid shifting issues
      for (const idx of indicesToRemove) {
        remove(idx);
      }
    }
  }, [watchedItems, remove]);

  const handleRemoveItem = (index: number) => {
    // Don't remove the last remaining row
    if (fields.length <= 1) return;
    const item = form.getValues(`items.${index}`);
    if (!item || isRowEmpty(item)) {
      remove(index);
    } else {
      setRemoveIndex(index);
    }
  };

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

      {/* Items */}
      <div className="space-y-2">
        <FormLabel>{dict.form.items}</FormLabel>
        {fields.length > 0 && (
          <div className="space-y-2">
            {(() => {
              const showDeleteCol = fields.length > 1;
              const gridCols = showDeleteCol
                ? "grid grid-cols-[1fr_1fr_1fr_auto] gap-2"
                : "grid grid-cols-3 gap-2";
              return (
                <>
                  <div className={gridCols}>
                    <span className="text-muted-foreground text-xs font-medium">
                      {dict.form.articleNumber}
                    </span>
                    <span className="text-muted-foreground text-xs font-medium">
                      {dict.form.quantity}
                    </span>
                    <span className="text-muted-foreground text-xs font-medium">
                      {dict.form.transferOrder}
                    </span>
                    {showDeleteCol && <span className="w-8" />}
                  </div>
                  {fields.map((item, index) => {
                    const isLastEmptyRow =
                      index === fields.length - 1 &&
                      (!watchedItems?.[index] ||
                        isRowEmpty(watchedItems[index]));
                    return (
                      <div key={item.id} className={gridCols}>
                        <FormField
                          control={form.control}
                          name={`items.${index}.article_number`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.transfer_order`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        {showDeleteCol && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            tabIndex={-1}
                            className="text-red-500"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <X />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        )}
        <AlertDialog
          open={removeIndex !== null}
          onOpenChange={(open) => {
            if (!open) setRemoveIndex(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {dict.form.removeItemConfirmTitle}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {dict.form.removeItemConfirm}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{dict.form.cancel}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (removeIndex !== null) {
                    remove(removeIndex);
                    setRemoveIndex(null);
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {dict.form.delete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
