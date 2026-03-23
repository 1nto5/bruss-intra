"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";
import { ClearableCombobox } from "@/components/clearable-combobox";
import { FreeTextCombobox } from "@/components/free-text-combobox";
import LocalizedLink from "@/components/localized-link";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CircleX, Loader, Save, Send } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  insertCorrection,
  submitCorrection,
  updateCorrection,
} from "../../actions/crud";
import { redirectToCorrections } from "../../actions/utils";
import type { Dictionary } from "../../lib/dict";
import { AUTO_TARGET_WAREHOUSES } from "../../lib/constants";
import type {
  CorrectionDoc,
  CorrectionKind,
  QuarryType,
  ReasonType,
  WarehouseType,
} from "../../lib/types";
import {
  createCorrectionSchema,
  type CorrectionFormValues,
} from "../../lib/zod";
import type { Locale } from "@/lib/config/i18n";
import RemoveItemDialog from "../dialogs/remove-item-dialog";
import LineItemRow from "./line-item-row";

interface CorrectionFormProps {
  warehouses: WarehouseType[];
  quarries: QuarryType[];
  reasons: ReasonType[];
  dict: Dictionary;
  lang: Locale;
  initialData?: CorrectionDoc;
}

const EMPTY_ITEM = {
  articleNumber: "",
  articleName: "",
  quarry: "",
  batch: "",
  quantity: 0,
  unitPrice: 0,
  value: 0,
  comment: "",
};

export default function CorrectionForm({
  warehouses,
  quarries,
  reasons,
  dict,
  lang,
  initialData,
}: CorrectionFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);
  const router = useRouter();
  const hasAutoAdded = useRef(false);
  const isEditMode = !!initialData;

  const schema = createCorrectionSchema(dict.validation);

  const getErrorMessage = (error: string): string => {
    const errorMessages: Record<string, string> = {
      unauthorized: dict.errors.unauthorized,
      "invalid status": dict.errors.invalidStatus,
      "already approved": dict.errors.alreadyApproved,
      "not found": dict.errors.notFound,
      "not updated": dict.errors.notUpdated,
      "no items": dict.errors.noItems,
    };
    return errorMessages[error] || dict.errors.contactIT;
  };

  const reasonOptions = reasons.map((r) =>
    lang === "pl" ? r.pl : lang === "de" ? r.de : r.label,
  );

  const reasonLabelToValue = (label: string): string => {
    const match = reasons.find(
      (r) => r.label === label || r.pl === label || r.de === label,
    );
    return match ? match.value : label;
  };

  const form = useForm<CorrectionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialData
      ? {
          _id: initialData._id?.toString(),
          type: initialData.type,
          sourceWarehouse: initialData.sourceWarehouse,
          targetWarehouse: initialData.targetWarehouse,
          reason: initialData.reason,
          items: initialData.items.map((item) => ({
            ...item,
            comment: item.comment || "",
            quarry: item.quarry || "",
          })),
        }
      : {
          type: "transfer" as CorrectionKind,
          sourceWarehouse: "",
          targetWarehouse: "",
          reason: "",
          items: [{ ...EMPTY_ITEM }],
        },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const correctionType = form.watch("type") as CorrectionKind;

  const isAutoTarget =
    correctionType === "nok-block" || correctionType === "scrapping";

  // When type changes, auto-set target warehouse for nok-block/scrapping
  useEffect(() => {
    const autoTarget = AUTO_TARGET_WAREHOUSES[correctionType];
    if (autoTarget) {
      form.setValue("targetWarehouse", autoTarget);
    }
  }, [correctionType, form]);

  const watchedItems = form.watch("items");

  const totalValue = watchedItems.reduce((sum, item) => {
    return (
      sum +
      Math.round((item.quantity || 0) * (item.unitPrice || 0) * 100) / 100
    );
  }, 0);

  // Auto-add new item when last item is complete
  const lastIndex = fields.length - 1;
  const lastItem = watchedItems[lastIndex];

  useEffect(() => {
    if (hasAutoAdded.current || !lastItem) return;

    const isComplete =
      lastItem.articleNumber.trim() !== "" &&
      lastItem.articleName.trim() !== "" &&
      lastItem.batch.trim() !== "" &&
      (lastItem.quantity ?? 0) >= 1 &&
      (lastItem.unitPrice ?? 0) >= 0;

    if (isComplete) {
      hasAutoAdded.current = true;
      append({ ...EMPTY_ITEM });
    }
  }, [lastItem, append, correctionType]);

  // Reset auto-add flag when fields length changes
  useEffect(() => {
    hasAutoAdded.current = false;
  }, [fields.length]);

  const handleRemoveItem = useCallback((index: number) => {
    setRemoveIndex(index);
  }, []);

  const confirmRemoveItem = useCallback(() => {
    if (removeIndex !== null) {
      remove(removeIndex);
      setRemoveIndex(null);
    }
  }, [removeIndex, remove]);

  const stripTrailingEmptyItems = useCallback(() => {
    const items = form.getValues("items");
    let lastNonEmpty = items.length - 1;
    while (lastNonEmpty > 0) {
      const item = items[lastNonEmpty];
      const isEmpty =
        item.articleNumber.trim() === "" &&
        item.articleName.trim() === "" &&
        item.batch.trim() === "" &&
        (item.quantity ?? 0) === 0;
      if (!isEmpty) break;
      lastNonEmpty--;
    }
    // Remove trailing empty items (keep at least 1)
    for (let i = items.length - 1; i > lastNonEmpty; i--) {
      remove(i);
    }
  }, [form, remove]);

  const handleSaveDraft = async () => {
    stripTrailingEmptyItems();
    const data = form.getValues();
    const submitData = { ...data, reason: reasonLabelToValue(data.reason) };
    setIsPending(true);
    try {
      const action = isEditMode ? updateCorrection : insertCorrection;
      const res = await action(submitData, lang);
      if ("success" in res) {
        toast.success(isEditMode ? dict.toast.updated : dict.toast.created);
        redirectToCorrections(lang);
      } else if (res.error === "validation" && res.issues) {
        toast.error(res.issues[0]?.message);
      } else {
        toast.error(getErrorMessage(res.error));
      }
    } catch {
      toast.error(dict.errors.contactIT);
    } finally {
      setIsPending(false);
    }
  };

  const handleSubmitForApproval = () => {
    stripTrailingEmptyItems();
    form.handleSubmit(async (data) => {
      const submitData = { ...data, reason: reasonLabelToValue(data.reason) };
      setIsPending(true);
      try {
        // First save/update
        const action = isEditMode ? updateCorrection : insertCorrection;
        const saveRes = await action(submitData, lang);
        if ("error" in saveRes) {
          if (saveRes.error === "validation" && saveRes.issues) {
            toast.error(saveRes.issues[0]?.message);
          } else {
            toast.error(getErrorMessage(saveRes.error));
          }
          return;
        }

        // Then submit for approval
        const correctionId = isEditMode
          ? data._id!
          : saveRes.success;
        const submitRes = await submitCorrection(correctionId);
        if ("success" in submitRes) {
          toast.success(dict.toast.submitted);
          redirectToCorrections(lang);
        } else {
          toast.error(getErrorMessage(submitRes.error));
        }
      } catch {
        toast.error(dict.errors.contactIT);
      } finally {
        setIsPending(false);
      }
    })();
  };

  return (
    <Card className="sm:w-[768px]">
      <CardHeader>
        <div className="space-y-2 sm:flex sm:justify-between sm:gap-4">
          <CardTitle>
            {isEditMode
              ? `${dict.form.editTitle} - ${initialData.correctionNumber}`
              : dict.form.title}
          </CardTitle>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft />{" "}
            <span>{dict.form.backToList}</span>
          </Button>
        </div>
      </CardHeader>
      <Separator className="mb-4" />

      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmitForApproval();
          }}
        >
          <CardContent className="grid w-full items-center gap-4">
            {/* Correction Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.type}</FormLabel>
                  <FormControl>
                    <ToggleGroup
                      type="single"
                      variant="outline"
                      className="w-full"
                      value={field.value}
                      onValueChange={(val) => {
                        if (val) field.onChange(val);
                      }}
                    >
                      <ToggleGroupItem value="transfer" className="flex-1">
                        {dict.types.transfer}
                      </ToggleGroupItem>
                      <ToggleGroupItem value="nok-block" className="flex-1">
                        {dict.types["nok-block"]}
                      </ToggleGroupItem>
                      <ToggleGroupItem value="scrapping" className="flex-1">
                        {dict.types.scrapping}
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Source Warehouse */}
            <FormField
              control={form.control}
              name="sourceWarehouse"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.sourceWarehouse}</FormLabel>
                  <FormControl>
                    <ClearableCombobox
                      className="w-full"
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      options={warehouses}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Target Warehouse */}
            <FormField
              control={form.control}
              name="targetWarehouse"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.targetWarehouse}</FormLabel>
                  <FormControl>
                    <ClearableCombobox
                      className="w-full"
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      options={warehouses}
                      disabled={isAutoTarget}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.reason}</FormLabel>
                  <FormControl>
                    <FreeTextCombobox
                      value={field.value}
                      onValueChange={field.onChange}
                      options={reasonOptions}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Line Items */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{dict.form.items}</h3>

              {fields.map((field, index) => (
                <LineItemRow
                  key={field.id}
                  index={index}
                  form={form}
                  quarries={quarries}
                  dict={dict}
                  isFirst={index === 0}
                  onRemove={() => handleRemoveItem(index)}
                />
              ))}
            </div>

            {/* Total Value */}
            <div className="flex justify-end pt-4 border-t">
              <div className="text-lg font-semibold">
                {dict.form.totalValue}:{" "}
                <span className="text-primary">
                  {totalValue.toFixed(2)} EUR
                </span>
              </div>
            </div>
          </CardContent>

          <Separator className="mb-4" />

          <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            {isEditMode ? (
              /* Edit mode: Discard Changes (left) + Save Changes (right) */
              <>
                <LocalizedLink href="/warehouse-corrections">
                  <Button
                    variant="destructive"
                    type="button"
                    className="w-full sm:w-auto"
                    disabled={isPending}
                  >
                    <CircleX />
                    {dict.form.discardChanges}
                  </Button>
                </LocalizedLink>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSaveDraft}
                    disabled={isPending}
                    className="w-full sm:w-auto"
                  >
                    {isPending ? (
                      <Loader className="animate-spin" />
                    ) : (
                      <Save />
                    )}
                    {dict.form.saveChanges}
                  </Button>
                  <Button
                    type="submit"
                    className="w-full sm:w-auto"
                    disabled={isPending}
                  >
                    {isPending ? (
                      <Loader className="animate-spin" />
                    ) : (
                      <Send />
                    )}
                    {dict.form.submitForApproval}
                  </Button>
                </div>
              </>
            ) : (
              /* New mode: Clear (left) + Save Draft + Submit (right) */
              <>
                <Button
                  variant="destructive"
                  type="button"
                  onClick={() => form.reset()}
                  className="w-full sm:w-auto"
                  disabled={isPending}
                >
                  <CircleX />
                  {dict.common.clear}
                </Button>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSaveDraft}
                    disabled={isPending}
                    className="w-full sm:w-auto"
                  >
                    <Save
                      className={isPending ? "animate-spin" : ""}
                    />
                    {dict.form.saveDraft}
                  </Button>
                  <Button
                    type="submit"
                    className="w-full sm:w-auto"
                    disabled={isPending}
                  >
                    <Send
                      className={isPending ? "animate-spin" : ""}
                    />
                    {dict.form.submitForApproval}
                  </Button>
                </div>
              </>
            )}
          </CardFooter>
        </form>
      </Form>

      <RemoveItemDialog
        isOpen={removeIndex !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveIndex(null);
        }}
        onConfirm={confirmRemoveItem}
        dict={dict}
      />
    </Card>
  );
}
