"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { ClearableCombobox } from "@/components/clearable-combobox";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { DateTimeInput } from "@/components/ui/datetime-input";

import { createCertificationSchema } from "../../lib/zod";
import { localize } from "../../lib/types";
import type { ConfigValue } from "../../lib/types";
import {
  insertCertification,
  updateCertification,
} from "../../actions/certifications";
import type { Dictionary } from "../../lib/dict";
import type { Locale } from "@/lib/config/i18n";

type CertificationFormData = z.input<
  ReturnType<typeof createCertificationSchema>
>;

interface CertificationData {
  _id: string;
  employeeIdentifier: string;
  employeeName?: string;
  certificationType: string;
  issuedDate: unknown;
  expirationDate?: unknown;
  documentRef?: string;
  notes?: string;
}

interface CertificationFormProps {
  dict: Dictionary;
  lang: Locale;
  employees: Array<{ value: string; label: string }>;
  certTypes: ConfigValue[];
  certification?: CertificationData;
  defaultEmployee?: string;
}

function toDateValue(date: unknown): Date | undefined {
  if (!date) return undefined;
  const d = date instanceof Date ? date : new Date(date as string);
  return isNaN(d.getTime()) ? undefined : d;
}

export function CertificationForm({
  dict,
  lang,
  employees,
  certTypes,
  certification,
  defaultEmployee,
}: CertificationFormProps) {
  const router = useRouter();
  const isEditing = !!certification;
  const schema = createCertificationSchema(dict.validation);
  const safeLang = (["pl", "de", "en"].includes(lang) ? lang : "pl") as
    | "pl"
    | "de"
    | "en";

  const certTypeOptions = certTypes.map((ct) => ({
    value: ct.slug,
    label: localize(ct.name, safeLang),
  }));

  const form = useForm<CertificationFormData>({
    resolver: zodResolver(schema),
    defaultValues: certification
      ? {
          employeeIdentifier: certification.employeeIdentifier,
          certificationType: certification.certificationType,
          issuedDate: toDateValue(certification.issuedDate),
          expirationDate: toDateValue(certification.expirationDate),
          documentRef: certification.documentRef || "",
          notes: certification.notes || "",
        }
      : {
          employeeIdentifier: defaultEmployee || "",
          certificationType: "",
          issuedDate: undefined,
          expirationDate: undefined,
          documentRef: "",
          notes: "",
        },
  });

  async function onSubmit(data: CertificationFormData) {
    const payload = {
      ...data,
      documentRef: data.documentRef || undefined,
      notes: data.notes || undefined,
    };

    const res = isEditing
      ? await updateCertification(certification!._id, payload, lang)
      : await insertCertification(payload, lang);

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
      isEditing ? dict.certifications.updated : dict.certifications.created,
    );
    router.push(`/${lang}/competency-matrix/certifications`);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing
            ? dict.certifications.editTitle
            : dict.certifications.addTitle}
        </CardTitle>
      </CardHeader>
      <Separator className="mb-4" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="grid w-full items-center gap-4 sm:grid-cols-2">
            {/* Employee */}
            <FormField
              control={form.control}
              name="employeeIdentifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.certifications.employee}</FormLabel>
                  <FormControl>
                    {isEditing ? (
                      <Input
                        value={
                          certification?.employeeName ||
                          employees.find((e) => e.value === field.value)
                            ?.label ||
                          field.value
                        }
                        disabled
                      />
                    ) : (
                      <ClearableCombobox
                        className="w-full"
                        value={field.value}
                        onValueChange={field.onChange}
                        options={employees}
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Certificate Type */}
            <FormField
              control={form.control}
              name="certificationType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.certifications.type}</FormLabel>
                  <FormControl>
                    <ClearableCombobox
                      className="w-full"
                      value={field.value}
                      onValueChange={field.onChange}
                      options={certTypeOptions}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Issued Date */}
            <FormField
              control={form.control}
              name="issuedDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.certifications.issuedDate}</FormLabel>
                  <FormControl>
                    <DateTimePicker
                      value={field.value as Date | undefined}
                      onChange={field.onChange}
                      hideTime
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

            {/* Expiration Date */}
            <FormField
              control={form.control}
              name="expirationDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.certifications.expirationDate}</FormLabel>
                  <FormControl>
                    <DateTimePicker
                      value={field.value as Date | undefined}
                      onChange={field.onChange}
                      hideTime
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

            {/* Document Ref */}
            <FormField
              control={form.control}
              name="documentRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.certifications.documentRef}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes - forced to new row, half-width */}
            <div className="col-start-1">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.certifications.notes}</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>

          <Separator className="mb-4" />

          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                router.push(`/${lang}/competency-matrix/certifications`)
              }
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
