"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { DateTimeInput } from "@/components/ui/datetime-input";
import { MultiSelect } from "@/components/ui/multi-select";

import { createEvaluationPeriodSchema } from "../../lib/zod";
import { EVALUATION_PERIOD_LABELS } from "../../lib/constants";
import { localize } from "../../lib/types";
import type { EvaluationPeriodKind } from "../../lib/types";
import {
  insertEvaluationPeriod,
  updateEvaluationPeriod,
} from "../../actions/evaluation-periods";
import type { Dictionary } from "../../lib/dict";
import type { Locale } from "@/lib/config/i18n";

const PERIOD_TYPES: EvaluationPeriodKind[] = [
  "annual",
  "pre-hire",
  "probation-2m",
  "probation-5m",
  "contract-end",
];

type EvaluationPeriodFormData = z.input<
  ReturnType<typeof createEvaluationPeriodSchema>
>;

interface EvaluationPeriodData {
  _id: string;
  name: string;
  type: string;
  startDate: unknown;
  endDate: unknown;
  employeeIdentifiers?: string[];
}

interface EvaluationPeriodFormProps {
  dict: Dictionary;
  lang: Locale;
  period?: EvaluationPeriodData;
  employeeOptions?: Array<{ value: string; label: string }>;
}

function toDateValue(date: unknown): Date | undefined {
  if (!date) return undefined;
  const d = date instanceof Date ? date : new Date(date as string);
  return isNaN(d.getTime()) ? undefined : d;
}

export function EvaluationPeriodForm({
  dict,
  lang,
  period,
  employeeOptions = [],
}: EvaluationPeriodFormProps) {
  const router = useRouter();
  const isEditing = !!period;
  const schema = createEvaluationPeriodSchema(dict.validation);
  const safeLang = (["pl", "de", "en"].includes(lang) ? lang : "pl") as
    | "pl"
    | "de"
    | "en";

  const form = useForm<EvaluationPeriodFormData>({
    resolver: zodResolver(schema),
    defaultValues: period
      ? {
          name: period.name,
          type: period.type as EvaluationPeriodKind,
          startDate: toDateValue(period.startDate),
          endDate: toDateValue(period.endDate),
          employeeIdentifiers: period.employeeIdentifiers || [],
        }
      : {
          name: "",
          type: "annual",
          startDate: undefined,
          endDate: undefined,
          employeeIdentifiers: [],
        },
  });

  async function onSubmit(data: EvaluationPeriodFormData) {
    const res = isEditing
      ? await updateEvaluationPeriod(period!._id, data, lang)
      : await insertEvaluationPeriod(data, lang);

    if ("error" in res) {
      if (res.error === "validation" && res.issues) {
        toast.error(res.issues[0]?.message || dict.errors.contactIT);
      } else if (res.error === "unauthorized") {
        toast.error(dict.errors.unauthorized);
      } else {
        toast.error(dict.errors.serverError);
      }
      return;
    }

    toast.success(
      isEditing ? dict.settings.periodUpdated : dict.settings.periodCreated,
    );
    router.push(`/${lang}/competency-matrix/settings`);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? dict.settings.editPeriod : dict.settings.addPeriod}
        </CardTitle>
      </CardHeader>
      <Separator className="mb-4" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="grid w-full items-center gap-4">
            {/* Period Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.settings.periodName}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Period Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.settings.periodType}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PERIOD_TYPES.map((pt) => (
                        <SelectItem key={pt} value={pt}>
                          {localize(EVALUATION_PERIOD_LABELS[pt], safeLang)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dates */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.settings.startDate}</FormLabel>
                    <FormControl>
                      <DateTimePicker
                        value={field.value as Date | undefined}
                        onChange={field.onChange}
                        renderTrigger={({ value, setOpen, open }) => (
                          <DateTimeInput
                            value={value}
                            onChange={field.onChange}
                            format="dd/MM/yyyy"
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
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.settings.endDate}</FormLabel>
                    <FormControl>
                      <DateTimePicker
                        value={field.value as Date | undefined}
                        onChange={field.onChange}
                        renderTrigger={({ value, setOpen, open }) => (
                          <DateTimeInput
                            value={value}
                            onChange={field.onChange}
                            format="dd/MM/yyyy"
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

            {/* Assigned Employees */}
            {employeeOptions.length > 0 && (
              <FormField
                control={form.control}
                name="employeeIdentifiers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.settings.assignedEmployees}</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={employeeOptions}
                        value={field.value || []}
                        onValueChange={field.onChange}
                        placeholder={dict.search}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/${lang}/competency-matrix/settings`)}
            >
              {dict.cancel}
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? dict.loading : dict.save}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
