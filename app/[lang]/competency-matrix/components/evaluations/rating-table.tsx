"use client";

import { EVALUATION_CRITERIA } from "../../lib/constants";
import {
  calculateSectionTotals,
  calculateGrandTotals,
  determineGrade,
} from "../../lib/evaluation-calculations";
import type { CriterionRating } from "../../lib/types";
import type { Dictionary } from "../../lib/dict";

type RatingMode = "self" | "supervisor";

interface RatingTableProps {
  initialRatings: CriterionRating[];
  ratings: Map<string, number | null>;
  onChange?: (criterionKey: string, value: number | null) => void;
  mode: RatingMode;
  dict: Dictionary;
  readOnly?: boolean;
  /** Prefix for radio button names (defaults to mode) - must be unique when
   *  two RatingTable instances share the same page. */
  prefix?: string;
  showGrandTotal?: boolean;
}

export function RatingTable({
  initialRatings,
  ratings,
  onChange,
  mode,
  dict,
  readOnly = false,
  prefix,
  showGrandTotal = false,
}: RatingTableProps) {
  const radioPrefix = prefix ?? mode;

  // Compute live totals
  const liveRatings = initialRatings.map((r) => ({
    ...r,
    ...(mode === "self"
      ? {
          selfRating: (ratings.get(r.criterionKey) ??
            null) as CriterionRating["selfRating"],
        }
      : {
          supervisorRating: (ratings.get(r.criterionKey) ??
            null) as CriterionRating["supervisorRating"],
        }),
  }));
  const sectionTotals = calculateSectionTotals(liveRatings);
  const { selfTotalPoints, supervisorTotalPoints } =
    calculateGrandTotals(sectionTotals);
  const displayTotal =
    mode === "self" ? selfTotalPoints : supervisorTotalPoints;
  const liveGrade = determineGrade(
    mode === "self" ? selfTotalPoints : supervisorTotalPoints,
  );
  const gradeLabel =
    dict.evaluations.grades[
      liveGrade as keyof typeof dict.evaluations.grades
    ] ?? liveGrade;

  return (
    <div className="space-y-6">
      {([1, 2, 3] as const).map((section) => {
        const config = EVALUATION_CRITERIA[section];
        const sectionKey = `section${section}` as keyof typeof dict.evaluations;
        const sectionTotal = sectionTotals.find((st) => st.section === section);
        const displaySectionTotal =
          mode === "self"
            ? (sectionTotal?.selfWeighted ?? 0)
            : (sectionTotal?.supervisorWeighted ?? 0);
        const displaySectionRaw =
          mode === "self"
            ? (sectionTotal?.selfTotal ?? 0)
            : (sectionTotal?.supervisorTotal ?? 0);

        return (
          <div key={section} className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 font-medium">
              {dict.evaluations[sectionKey] as string} (
              {dict.evaluations.weight} ×{config.weight})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left font-medium w-1/3">
                      {dict.evaluations.criterion}
                    </th>
                    <th className="p-2 text-center font-medium" colSpan={5}>
                      {mode === "self"
                        ? dict.evaluations.selfRating
                        : dict.evaluations.supervisorRating}
                    </th>
                  </tr>
                  <tr className="border-b bg-muted/30">
                    <th></th>
                    {[1, 2, 3, 4, 5].map((v) => (
                      <th key={v} className="p-1 text-center text-xs w-12">
                        {v}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {config.criteria.map((criterion) => {
                    const currentValue = ratings.get(criterion.key) ?? null;
                    const criterionLabel =
                      dict.evaluations.criteria[
                        criterion.nameKey as keyof typeof dict.evaluations.criteria
                      ] ?? criterion.nameKey;

                    return (
                      <tr key={criterion.key} className="border-b">
                        <td className="p-2">
                          <span className="text-muted-foreground mr-1">
                            {criterion.key}
                          </span>
                          {criterionLabel}
                        </td>
                        {[1, 2, 3, 4, 5].map((v) => (
                          <td key={v} className="p-1 text-center">
                            <input
                              type="radio"
                              name={`${radioPrefix}-${criterion.key}`}
                              checked={currentValue === v}
                              onChange={() => onChange?.(criterion.key, v)}
                              disabled={readOnly}
                              className="h-4 w-4 cursor-pointer accent-primary disabled:cursor-default disabled:opacity-50"
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 font-bold bg-muted/30">
                    <td className="p-2">
                      {dict.evaluations.total} / {dict.evaluations.weighted}
                    </td>
                    <td colSpan={5} className="p-2 text-center">
                      {displaySectionRaw} → {displaySectionTotal}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {showGrandTotal && (
        <div className="flex items-center gap-4 border-t pt-4">
          <div className="text-lg font-bold">
            {dict.evaluations.grandTotal}: {displayTotal}
          </div>
          {displayTotal > 0 && (
            <div className="text-lg font-bold text-muted-foreground">
              → {gradeLabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
