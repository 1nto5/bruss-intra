export const dynamic = "force-dynamic";

import { ObjectId } from "mongodb";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { dbc } from "@/lib/db/mongo";
import { Locale } from "@/lib/config/i18n";
import { formatDate } from "@/lib/utils/date-format";
import { getDictionary } from "../../../lib/dict";
import { COLLECTIONS } from "../../../lib/constants";
import type { EvaluationDocType } from "../../../lib/types";
import { hasFullAccess, canSupervisorAssess } from "../../../lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EvaluationSummary } from "../../../components/evaluations/evaluation-summary";
import { EvaluationForm } from "../../../components/evaluations/evaluation-form";
import { EvaluationStatusActions } from "./status-actions";

export default async function EvaluationDetailPage({
  params,
}: {
  params: Promise<{ lang: Locale; id: string }>;
}) {
  const { lang, id } = await params;
  const dict = await getDictionary(lang);
  const session = await auth();

  if (!session || !session.user?.email) {
    redirect(`/${lang}/auth?callbackUrl=/competency-matrix/evaluations/${id}`);
  }

  if (!ObjectId.isValid(id)) notFound();

  const evaluationsColl = await dbc(COLLECTIONS.evaluations);
  const evaluation = await evaluationsColl.findOne({
    _id: new ObjectId(id),
  });

  if (!evaluation) notFound();

  const userRoles = session.user.roles ?? [];
  const hrAdmin = hasFullAccess(userRoles);
  const canAssess = canSupervisorAssess(userRoles);
  const isDraft = evaluation.status === "draft";
  const isSubmitted = evaluation.status === "submitted";

  // ── Smart dispatcher: draft + supervisor/HR → edit mode ───────────
  if (isDraft && (canAssess || hrAdmin)) {
    return (
      <EvaluationForm
        dict={dict}
        lang={lang}
        evaluation={
          {
            ...evaluation,
            _id: id,
          } as unknown as EvaluationDocType & { _id: string }
        }
      />
    );
  }

  // ── Read-only view ────────────────────────────────────────────────
  const statusVariant = (status: string) => {
    switch (status) {
      case "draft":
        return "statusPending" as const;
      case "submitted":
        return "statusInProgress" as const;
      case "approved":
        return "statusApproved" as const;
      default:
        return "outline" as const;
    }
  };

  const causeLabel =
    dict.evaluations.causes[
      evaluation.cause as keyof typeof dict.evaluations.causes
    ] ?? evaluation.cause;

  const recommendationLabel =
    dict.evaluations.recommendations[
      evaluation.recommendation as keyof typeof dict.evaluations.recommendations
    ] ?? evaluation.recommendation;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{dict.evaluations.detailTitle}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {evaluation.employeeName} - {formatDate(evaluation.periodFrom)} -{" "}
              {formatDate(evaluation.periodTo)}
            </p>
          </div>
          <Badge variant={statusVariant(evaluation.status)} size="lg">
            {dict.status[evaluation.status as keyof typeof dict.status] ??
              evaluation.status}
          </Badge>
        </CardHeader>
      </Card>

      {/* Part A: Employee & Assessor Data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{dict.evaluations.partA}</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">{dict.evaluations.employee}</h4>
              <div>
                {dict.employees.name}:{" "}
                <strong>{evaluation.employeeName}</strong>
              </div>
              <div>
                {dict.employees.identifier}: {evaluation.employeeIdentifier}
              </div>
              <div>
                {dict.employees.position}: {evaluation.employeePosition || "-"}
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
            <div className="space-y-2">
              <h4 className="font-medium">{dict.evaluations.assessor}</h4>
              <div>
                {dict.employees.name}:{" "}
                <strong>{evaluation.assessorName}</strong>
              </div>
              <div>
                {dict.employees.position}: {evaluation.assessorPosition || "-"}
              </div>
              <div>
                {dict.employees.department}:{" "}
                {evaluation.assessorDepartment || "-"}
              </div>
            </div>
          </div>
          <div className="mt-4 text-sm space-y-1">
            <div>
              {dict.evaluations.cause}: <strong>{causeLabel}</strong>
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
        </CardContent>
      </Card>

      {/* Part B: Ratings Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{dict.evaluations.partB}</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          <EvaluationSummary
            sectionTotals={evaluation.sectionTotals}
            selfTotalPoints={evaluation.selfTotalPoints}
            supervisorTotalPoints={evaluation.supervisorTotalPoints}
            grade={evaluation.grade}
            isPositive={evaluation.isPositive}
            dict={dict}
          />
        </CardContent>
      </Card>

      {/* Part C: Remarks */}
      {(evaluation.assessorRemarks || evaluation.employeeRemarks) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {dict.evaluations.partC}
            </CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4 space-y-3 text-sm">
            {evaluation.assessorRemarks && (
              <div>
                <span className="font-medium">
                  {dict.evaluations.assessorRemarks}:
                </span>{" "}
                {evaluation.assessorRemarks}
              </div>
            )}
            {evaluation.employeeRemarks && (
              <div>
                <span className="font-medium">
                  {dict.evaluations.employeeRemarks}:
                </span>{" "}
                {evaluation.employeeRemarks}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Part D: Recommendation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{dict.evaluations.partD}</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4 text-sm space-y-2">
          <div>
            {dict.evaluations.recommendation}:{" "}
            <strong>{recommendationLabel}</strong>
          </div>
          {evaluation.recommendationDetails && (
            <div>
              {dict.evaluations.recommendationDetails}:{" "}
              {evaluation.recommendationDetails}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 flex-wrap">
        {isDraft && canAssess && (
          <Button asChild variant="outline">
            <Link href={`/${lang}/competency-matrix/evaluations/${id}/self`}>
              {dict.evaluations.fillSelfAssessment}
              {evaluation.selfAssessmentStatus === "completed" && " ✓"}
            </Link>
          </Button>
        )}

        {(isDraft || isSubmitted) && (canAssess || hrAdmin) && (
          <EvaluationStatusActions
            evaluationId={id}
            status={evaluation.status}
            hasFullAccess={hrAdmin}
            dict={dict}
          />
        )}
      </div>
    </div>
  );
}
