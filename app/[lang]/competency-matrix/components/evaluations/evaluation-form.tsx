"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import * as z from "zod";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { ClearableCombobox } from "@/components/clearable-combobox";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { DateTimeInput } from "@/components/ui/datetime-input";

import { createFullEvaluationSchema } from "../../lib/zod";
import {
  EVALUATION_CAUSES,
  EVALUATION_RECOMMENDATIONS,
} from "../../lib/constants";
import { buildEmptyRatings } from "../../lib/evaluation-calculations";
import { formatDate } from "@/lib/utils/date-format";
import type { CriterionRating, EvaluationDocType } from "../../lib/types";
import type { Dictionary } from "../../lib/dict";
import type { Locale } from "@/lib/config/i18n";
import {
  createEvaluation,
  saveFullEvaluation,
} from "../../actions/evaluations";
import { RatingTable } from "./rating-table";

type FullEvaluationFormData = z.input<
  ReturnType<typeof createFullEvaluationSchema>
>;

interface EvaluationFormProps {
  dict: Dictionary;
  lang: Locale;
  /** Employee options for the combobox (create mode) */
  employees?: Array<{ value: string; label: string }>;
  /** Pre-selected employee identifier (create mode, from query param) */
  defaultEmployee?: string;
  /** Pre-filled employee info for display (create mode with prefill) */
  prefillEmployee?: {
    identifier: string;
    name: string;
    position: string;
    department: string;
  } | null;
  /** Existing evaluation (edit mode) */
  evaluation?: EvaluationDocType & { _id: string };
  /** Available evaluation periods for the selected employee (create mode) */
  periodOptions?: Array<{
    _id: string;
    name: string;
    type: string;
    startDate: string;
    endDate: string;
  }>;
}

function toDateValue(date: unknown): Date | undefined {
  if (!date) return undefined;
  const d = date instanceof Date ? date : new Date(date as string);
  return isNaN(d.getTime()) ? undefined : d;
}

export function EvaluationForm({
  dict,
  lang,
  employees = [],
  defaultEmployee,
  prefillEmployee,
  evaluation,
  periodOptions = [],
}: EvaluationFormProps) {
  const router = useRouter();
  const isEditing = !!evaluation;
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const schema = createFullEvaluationSchema(dict.validation);

  const form = useForm<FullEvaluationFormData>({
    resolver: zodResolver(schema),
    defaultValues: isEditing
      ? {
          employeeIdentifier: evaluation.employeeIdentifier,
          periodFrom: toDateValue(evaluation.periodFrom),
          periodTo: toDateValue(evaluation.periodTo),
          cause: evaluation.cause,
          recentTrainings: evaluation.recentTrainings || [],
          assessorRemarks: evaluation.assessorRemarks || "",
          employeeRemarks: evaluation.employeeRemarks || "",
          recommendation: evaluation.recommendation || "keep-position",
          recommendationDetails: evaluation.recommendationDetails || "",
        }
      : {
          employeeIdentifier:
            defaultEmployee || prefillEmployee?.identifier || "",
          periodFrom: undefined,
          periodTo: undefined,
          cause: "standard" as const,
          recentTrainings: [],
          assessorRemarks: "",
          employeeRemarks: "",
          recommendation: "keep-position" as const,
          recommendationDetails: "",
        },
  });

  // ── Ratings state ────────────────────────────────────────────────────
  const emptyRatings = buildEmptyRatings();
  const baseRatings = evaluation?.ratings ?? emptyRatings;

  const [selfRatings, setSelfRatings] = useState<Map<string, number | null>>(
    () => {
      const map = new Map<string, number | null>();
      for (const r of baseRatings) {
        map.set(r.criterionKey, r.selfRating);
      }
      return map;
    },
  );

  const [supervisorRatings, setSupervisorRatings] = useState<
    Map<string, number | null>
  >(() => {
    const map = new Map<string, number | null>();
    for (const r of baseRatings) {
      map.set(r.criterionKey, r.supervisorRating);
    }
    return map;
  });

  function handleSelfRatingChange(criterionKey: string, value: number | null) {
    setSelfRatings((prev) => {
      const next = new Map(prev);
      next.set(criterionKey, value);
      return next;
    });
  }

  function handleSupervisorRatingChange(
    criterionKey: string,
    value: number | null,
  ) {
    setSupervisorRatings((prev) => {
      const next = new Map(prev);
      next.set(criterionKey, value);
      return next;
    });
  }

  // ── Trainings array management ─────────────────────────────────────
  const trainings = form.watch("recentTrainings") || [];

  function addTraining() {
    if (trainings.length < 5) {
      form.setValue("recentTrainings", [...trainings, ""]);
    }
  }

  function removeTraining(index: number) {
    form.setValue(
      "recentTrainings",
      trainings.filter((_: string, i: number) => i !== index),
    );
  }

  function updateTraining(index: number, value: string) {
    const next = [...trainings];
    next[index] = value;
    form.setValue("recentTrainings", next);
  }

  // ── Watched recommendation for conditional details field ───────────
  const recommendation = form.watch("recommendation");
  const showRecommendationDetails =
    recommendation === "keep-with-conditions" || recommendation === "other";

  // ── Submit ─────────────────────────────────────────────────────────
  async function onSubmit(data: FullEvaluationFormData) {
    if (isEditing) {
      // Supervisor edit mode - save everything
      const selfRatingEntries = Array.from(selfRatings.entries()).map(
        ([criterionKey, rating]) => ({ criterionKey, rating }),
      );
      const supervisorRatingEntries = Array.from(
        supervisorRatings.entries(),
      ).map(([criterionKey, rating]) => ({ criterionKey, rating }));

      const res = await saveFullEvaluation(evaluation._id, {
        selfRatings: selfRatingEntries,
        supervisorRatings: supervisorRatingEntries,
        assessorRemarks: data.assessorRemarks || undefined,
        employeeRemarks: data.employeeRemarks || undefined,
        recommendation: data.recommendation!,
        recommendationDetails: data.recommendationDetails || undefined,
      });

      if ("error" in res) {
        if (res.error === "validation" && "issues" in res) {
          toast.error(
            (res as { error: string; issues: { message: string }[] }).issues[0]
              ?.message || dict.errors.contactIT,
          );
        } else if (res.error === "unauthorized") {
          toast.error(dict.errors.unauthorized);
        } else {
          toast.error(dict.errors.serverError);
        }
        return;
      }

      toast.success(dict.evaluations.draftSaved);
      router.push(`/${lang}/competency-matrix/evaluations/${evaluation._id}`);
      router.refresh();
    } else {
      // Create mode - create the evaluation, then save all ratings/remarks
      const res = await createEvaluation(
        {
          employeeIdentifier: data.employeeIdentifier,
          periodFrom: (data.periodFrom as Date).toISOString(),
          periodTo: (data.periodTo as Date).toISOString(),
          cause: data.cause,
          recentTrainings: (data.recentTrainings || []).filter(Boolean),
          evaluationPeriodId: selectedPeriodId || undefined,
        },
        lang,
      );

      if ("error" in res) {
        if (res.error === "validation" && "issues" in res) {
          toast.error(
            (res as { error: string; issues: { message: string }[] }).issues[0]
              ?.message || dict.errors.contactIT,
          );
        } else if (res.error === "unauthorized") {
          toast.error(dict.errors.unauthorized);
        } else {
          toast.error(dict.errors.serverError);
        }
        return;
      }

      // Save ratings, remarks, and recommendation on the newly created evaluation
      const newId = "id" in res ? res.id : undefined;
      if (newId) {
        const selfRatingEntries = Array.from(selfRatings.entries()).map(
          ([criterionKey, rating]) => ({ criterionKey, rating }),
        );
        const supervisorRatingEntries = Array.from(
          supervisorRatings.entries(),
        ).map(([criterionKey, rating]) => ({ criterionKey, rating }));

        const saveRes = await saveFullEvaluation(newId, {
          selfRatings: selfRatingEntries,
          supervisorRatings: supervisorRatingEntries,
          assessorRemarks: data.assessorRemarks || undefined,
          employeeRemarks: data.employeeRemarks || undefined,
          recommendation: data.recommendation!,
          recommendationDetails: data.recommendationDetails || undefined,
        });

        if ("error" in saveRes) {
          // Evaluation was created but ratings failed to save - redirect to edit
          toast.error(dict.errors.serverError);
          router.push(`/${lang}/competency-matrix/evaluations/${newId}`);
          router.refresh();
          return;
        }
      }

      toast.success(dict.evaluations.created);
      if (newId) {
        router.push(`/${lang}/competency-matrix/evaluations/${newId}`);
      } else {
        router.push(cancelUrl);
      }
      router.refresh();
    }
  }

  const cancelUrl = isEditing
    ? `/${lang}/competency-matrix/evaluations/${evaluation._id}`
    : defaultEmployee
      ? `/${lang}/competency-matrix/employees/${defaultEmployee}`
      : `/${lang}/competency-matrix/employees`;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>
              {isEditing
                ? dict.evaluations.detailTitle
                : dict.evaluations.createTitle}
            </CardTitle>
            {isEditing && (
              <p className="text-sm text-muted-foreground">
                {evaluation.employeeName}
              </p>
            )}
          </CardHeader>
          <Separator />

          <CardContent className="space-y-6 pt-6">
            {/* ── Part A - Employee & Assessor Data ───────────────── */}
            <h3 className="text-sm font-medium">{dict.evaluations.partA}</h3>

            {isEditing ? (
              /* Read-only info block for existing evaluation */
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                  <div className="space-y-1">
                    <h4 className="font-medium">{dict.evaluations.employee}</h4>
                    <div>
                      {dict.employees.name}:{" "}
                      <strong>{evaluation.employeeName}</strong>
                    </div>
                    <div>
                      {dict.employees.identifier}:{" "}
                      {evaluation.employeeIdentifier}
                    </div>
                    <div>
                      {dict.employees.position}:{" "}
                      {evaluation.employeePosition || "-"}
                    </div>
                    <div>
                      {dict.employees.department}:{" "}
                      {evaluation.employeeDepartment || "-"}
                    </div>
                    <div>
                      {dict.employees.hireDate}:{" "}
                      {formatDate(evaluation.employeeHireDate)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-medium">{dict.evaluations.assessor}</h4>
                    <div>
                      {dict.employees.name}:{" "}
                      <strong>{evaluation.assessorName}</strong>
                    </div>
                    <div>
                      {dict.employees.position}:{" "}
                      {evaluation.assessorPosition || "-"}
                    </div>
                    <div>
                      {dict.employees.department}:{" "}
                      {evaluation.assessorDepartment || "-"}
                    </div>
                  </div>
                </div>
                <div className="text-sm space-y-1">
                  <div>
                    {dict.evaluations.period}:{" "}
                    <strong>
                      {formatDate(evaluation.periodFrom)} -{" "}
                      {formatDate(evaluation.periodTo)}
                    </strong>
                  </div>
                  <div>
                    {dict.evaluations.cause}:{" "}
                    <strong>
                      {dict.evaluations.causes[
                        evaluation.cause as keyof typeof dict.evaluations.causes
                      ] ?? evaluation.cause}
                    </strong>
                  </div>
                  {evaluation.previousEvaluation && (
                    <div>
                      {dict.evaluations.previousEvaluation}:{" "}
                      {dict.evaluations.grades[
                        evaluation.previousEvaluation
                          .totalMark as keyof typeof dict.evaluations.grades
                      ] ?? evaluation.previousEvaluation.totalMark}{" "}
                      ({formatDate(evaluation.previousEvaluation.date)})
                    </div>
                  )}
                  {evaluation.recentTrainings?.length > 0 && (
                    <div>
                      {dict.evaluations.recentTrainings}:{" "}
                      {evaluation.recentTrainings.join(", ")}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Editable fields for create mode */
              <>
                {prefillEmployee ? (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <span className="text-muted-foreground">
                          {dict.employees.name}:
                        </span>{" "}
                        <strong>{prefillEmployee.name}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {dict.employees.identifier}:
                        </span>{" "}
                        {prefillEmployee.identifier}
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {dict.employees.position}:
                        </span>{" "}
                        {prefillEmployee.position || "-"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {dict.employees.department}:
                        </span>{" "}
                        {prefillEmployee.department || "-"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <FormField
                    control={form.control}
                    name="employeeIdentifier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{dict.evaluations.employee}</FormLabel>
                        <FormControl>
                          <ClearableCombobox
                            className="w-full"
                            value={field.value}
                            onValueChange={field.onChange}
                            options={employees}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {periodOptions.length > 0 ? (
                    <>
                      <FormItem className="sm:col-span-2">
                        <FormLabel>{dict.evaluations.period}</FormLabel>
                        <Select
                          value={selectedPeriodId}
                          onValueChange={(val) => {
                            setSelectedPeriodId(val);
                            const period = periodOptions.find(
                              (p) => p._id === val,
                            );
                            if (period) {
                              form.setValue(
                                "periodFrom",
                                new Date(period.startDate),
                              );
                              form.setValue(
                                "periodTo",
                                new Date(period.endDate),
                              );
                              form.setValue("evaluationPeriodId", period._id);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={dict.evaluations.selectPeriod}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {periodOptions.map((p) => (
                              <SelectItem key={p._id} value={p._id}>
                                {p.name} (
                                {new Date(p.startDate).toLocaleDateString()} -{" "}
                                {new Date(p.endDate).toLocaleDateString()})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    </>
                  ) : prefillEmployee ? (
                    <p className="text-sm text-muted-foreground sm:col-span-2">
                      {dict.evaluations.noPeriodAssigned}
                    </p>
                  ) : (
                    <>
                      <FormField
                        control={form.control}
                        name="periodFrom"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{dict.evaluations.periodFrom}</FormLabel>
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
                      <FormField
                        control={form.control}
                        name="periodTo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{dict.evaluations.periodTo}</FormLabel>
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
                    </>
                  )}
                  <FormField
                    control={form.control}
                    name="cause"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{dict.evaluations.cause}</FormLabel>
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
                            {EVALUATION_CAUSES.map((c) => (
                              <SelectItem key={c} value={c}>
                                {dict.evaluations.causes[
                                  c as keyof typeof dict.evaluations.causes
                                ] ?? c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Recent trainings */}
                <div className="space-y-3">
                  <p className="text-sm font-medium leading-none">
                    {dict.evaluations.recentTrainings}
                  </p>
                  {trainings.map((t: string, i: number) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={t}
                        onChange={(e) => updateTraining(i, e.target.value)}
                        placeholder={`${dict.evaluations.recentTrainings} ${i + 1}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTraining(i)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {trainings.length < 5 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addTraining}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      {dict.evaluations.addTraining}
                    </Button>
                  )}
                </div>
              </>
            )}

            {/* ── Part B - Self-Assessment (edit mode only - for supervisor filling on behalf of employee) */}
            {isEditing && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium">
                      {dict.evaluations.selfAssessmentTitle}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {dict.evaluations.onBehalfOf}
                    </p>
                  </div>
                  <RatingTable
                    initialRatings={baseRatings}
                    ratings={selfRatings}
                    onChange={handleSelfRatingChange}
                    mode="self"
                    dict={dict}
                    prefix="self"
                  />
                </div>
              </>
            )}

            {/* ── Part B - Supervisor Ratings ──────────────────── */}
            <Separator />
            <div className="space-y-4">
              <h3 className="text-sm font-medium">
                {dict.evaluations.supervisorAssessmentTitle}
              </h3>
              <RatingTable
                initialRatings={baseRatings}
                ratings={supervisorRatings}
                onChange={handleSupervisorRatingChange}
                mode="supervisor"
                dict={dict}
                prefix="supervisor"
                showGrandTotal
              />
            </div>

            {/* ── Part C - Remarks ─────────────────────────────── */}
            <Separator />
            <div className="space-y-4">
              <h3 className="text-sm font-medium">{dict.evaluations.partC}</h3>
              <FormField
                control={form.control}
                name="assessorRemarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.evaluations.assessorRemarks}</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="employeeRemarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.evaluations.employeeRemarks}</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ── Part D - Recommendation ──────────────────────── */}
            <Separator />
            <div className="space-y-4">
              <h3 className="text-sm font-medium">{dict.evaluations.partD}</h3>
              <FormField
                control={form.control}
                name="recommendation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.evaluations.recommendation}</FormLabel>
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
                        {EVALUATION_RECOMMENDATIONS.map((rec) => (
                          <SelectItem key={rec} value={rec}>
                            {dict.evaluations.recommendations[
                              rec as keyof typeof dict.evaluations.recommendations
                            ] ?? rec}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {showRecommendationDetails && (
                <FormField
                  control={form.control}
                  name="recommendationDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {dict.evaluations.recommendationDetails}
                      </FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </CardContent>

          {/* ── Footer: Cancel + Save ────────────────────────────── */}
          <Separator />
          <CardFooter className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(cancelUrl)}
            >
              {dict.cancel}
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? dict.loading : dict.save}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
