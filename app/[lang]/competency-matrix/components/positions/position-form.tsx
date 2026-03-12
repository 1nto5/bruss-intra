"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import * as z from "zod";
import { ChevronsUpDown, Loader, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

import { createPositionSchema } from "../../lib/zod";
import { EDUCATION_LEVELS, EXPERIENCE_LEVELS } from "../../lib/types";
import type {
  PositionType,
  CompetencyType,
  RequiredCompetency,
  ConfigValue,
} from "../../lib/types";
import {
  EDUCATION_LEVEL_LABELS,
  EXPERIENCE_LEVEL_LABELS,
} from "../../lib/constants";
import { localize } from "../../lib/types";
import type { Dictionary } from "../../lib/dict";
import { insertPosition, updatePosition } from "../../actions/positions";
import { RequirementsEditor } from "./requirements-editor";
import type { Locale } from "@/lib/config/i18n";

type PositionFormData = z.input<ReturnType<typeof createPositionSchema>>;

interface PositionFormProps {
  dict: Dictionary;
  lang: Locale;
  competencies: CompetencyType[];
  departments: string[];
  positionNames?: string[];
  certificationTypes: ConfigValue[];
  position?: PositionType;
}

export function PositionForm({
  dict,
  lang,
  competencies,
  departments,
  positionNames = [],
  certificationTypes,
  position,
}: PositionFormProps) {
  const router = useRouter();
  const isEditing = !!position;
  const schema = createPositionSchema(dict.validation);
  const safeLang = (["pl", "de", "en"].includes(lang) ? lang : "pl") as
    | "pl"
    | "de"
    | "en";

  const form = useForm<PositionFormData>({
    resolver: zodResolver(schema),
    defaultValues: position
      ? {
          name: position.name,
          department: position.department,
          requiredCompetencies: position.requiredCompetencies,
          requiredExperience: position.requiredExperience,
          requiredEducation: position.requiredEducation,
          requiredCertifications: position.requiredCertifications,
          active: position.active,
        }
      : {
          name: { pl: "", de: "", en: "" },
          department: "",
          requiredCompetencies: [],
          requiredExperience: "none",
          requiredEducation: "none",
          requiredCertifications: [],
          active: true,
        },
  });

  async function onSubmit(data: PositionFormData) {
    const res = isEditing
      ? await updatePosition(position!._id!, data, lang)
      : await insertPosition(data, lang);

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

    toast.success(isEditing ? dict.positions.updated : dict.positions.created);
    router.push(`/${lang}/competency-matrix/positions`);
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Name + Department + Experience + Education */}
        <Card>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">{dict.positions.name}</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="name.pl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PL</FormLabel>
                      <PositionNameCombobox
                        options={positionNames}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={dict.positions.name}
                        searchPlaceholder={dict.search}
                        emptyLabel={dict.noData}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {(["de", "en"] as const).map((locale) => (
                  <FormField
                    key={locale}
                    control={form.control}
                    name={`name.${locale}`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{locale.toUpperCase()}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.positions.department}</FormLabel>
                    <DepartmentCombobox
                      departments={departments}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={dict.positions.department}
                      searchPlaceholder={dict.search}
                      emptyLabel={dict.noData}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="requiredExperience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.positions.requiredExperience}</FormLabel>
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
                        {EXPERIENCE_LEVELS.map((lvl) => (
                          <SelectItem key={lvl} value={lvl}>
                            {localize(EXPERIENCE_LEVEL_LABELS[lvl], safeLang)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="requiredEducation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.positions.requiredEducation}</FormLabel>
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
                        {EDUCATION_LEVELS.map((lvl) => (
                          <SelectItem key={lvl} value={lvl}>
                            {localize(EDUCATION_LEVEL_LABELS[lvl], safeLang)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Required Certifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {dict.positions.requiredCertifications}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="requiredCertifications"
              render={({ field }) => (
                <FormItem>
                  <div className="flex flex-wrap gap-2">
                    {certificationTypes.map((ct) => {
                      const isSelected = field.value?.includes(ct.slug);
                      return (
                        <Button
                          key={ct.slug}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            const current = field.value || [];
                            field.onChange(
                              isSelected
                                ? current.filter((c: string) => c !== ct.slug)
                                : [...current, ct.slug],
                            );
                          }}
                        >
                          {localize(ct.name, safeLang)}
                        </Button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Required Competencies Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {dict.positions.requiredCompetencies}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="requiredCompetencies"
              render={({ field }) => (
                <FormItem>
                  <RequirementsEditor
                    competencies={competencies}
                    requirements={field.value as RequiredCompetency[]}
                    onChange={field.onChange}
                    dict={dict}
                    lang={safeLang}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Form actions */}
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/${lang}/competency-matrix/positions`)}
          >
            {dict.cancel}
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <Loader className="animate-spin" />
            ) : (
              <Save />
            )}
            {dict.save}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function PositionNameCombobox({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyLabel,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {options.map((name) => (
                <CommandItem
                  key={name}
                  value={name}
                  onSelect={() => {
                    onChange(name);
                    setOpen(false);
                  }}
                >
                  {name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function DepartmentCombobox({
  departments,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyLabel,
}: {
  departments: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {departments.map((d) => (
                <CommandItem
                  key={d}
                  value={d}
                  onSelect={(val) => {
                    onChange(val);
                    setOpen(false);
                  }}
                >
                  {d}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
