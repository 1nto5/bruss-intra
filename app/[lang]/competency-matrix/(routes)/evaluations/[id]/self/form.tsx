"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RatingTable } from "../../../../components/evaluations/rating-table";
import { saveEvaluationSelfRatings } from "../../../../actions/evaluations";
import type { CriterionRating } from "../../../../lib/types";
import type { Dictionary } from "../../../../lib/dict";

interface SelfAssessmentFormProps {
  evaluationId: string;
  employeeName: string;
  initialRatings: CriterionRating[];
  lang: string;
  dict: Dictionary;
}

export function SelfAssessmentForm({
  evaluationId,
  employeeName,
  initialRatings,
  lang,
  dict,
}: SelfAssessmentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [ratings, setRatings] = useState<Map<string, number | null>>(() => {
    const map = new Map<string, number | null>();
    for (const r of initialRatings) {
      map.set(r.criterionKey, r.selfRating);
    }
    return map;
  });

  function handleRatingChange(criterionKey: string, value: number | null) {
    setRatings((prev) => {
      const next = new Map(prev);
      next.set(criterionKey, value);
      return next;
    });
  }

  function handleSubmit() {
    const ratingEntries = Array.from(ratings.entries()).map(
      ([criterionKey, rating]) => ({ criterionKey, rating }),
    );

    startTransition(async () => {
      const result = await saveEvaluationSelfRatings(
        evaluationId,
        ratingEntries,
      );

      if ("error" in result) {
        if (result.error === "unauthorized") {
          toast.error(dict.errors.unauthorized);
        } else {
          toast.error(dict.errors.serverError);
        }
      } else {
        toast.success(dict.evaluations.ratingsSaved);
        router.push(`/${lang}/competency-matrix/evaluations/${evaluationId}`);
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.evaluations.selfAssessmentTitle}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {employeeName} - {dict.evaluations.onBehalfOf}
        </p>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        <RatingTable
          initialRatings={initialRatings}
          ratings={ratings}
          onChange={handleRatingChange}
          mode="self"
          dict={dict}
          showGrandTotal
        />
      </CardContent>
      <Separator />
      <CardFooter className="flex justify-between pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            router.push(
              `/${lang}/competency-matrix/evaluations/${evaluationId}`,
            )
          }
        >
          {dict.cancel}
        </Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? dict.loading : dict.save}
        </Button>
      </CardFooter>
    </Card>
  );
}
