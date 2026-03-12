import { EVALUATION_CRITERIA, EVALUATION_GRADE_THRESHOLDS } from "./constants";
import type { CriterionRating, SectionTotal, EvaluationGrade } from "./types";

/**
 * Calculate section totals from criterion ratings.
 * Each section sums its criterion ratings, then multiplies by the section weight.
 */
export function calculateSectionTotals(
  ratings: CriterionRating[],
): SectionTotal[] {
  const ratingMap = new Map(ratings.map((r) => [r.criterionKey, r]));

  return ([1, 2, 3] as const).map((section) => {
    const config = EVALUATION_CRITERIA[section];
    let selfTotal = 0;
    let supervisorTotal = 0;

    for (const criterion of config.criteria) {
      const rating = ratingMap.get(criterion.key);
      if (rating) {
        selfTotal += rating.selfRating ?? 0;
        supervisorTotal += rating.supervisorRating ?? 0;
      }
    }

    return {
      section,
      selfTotal,
      supervisorTotal,
      weight: config.weight,
      selfWeighted: selfTotal * config.weight,
      supervisorWeighted: supervisorTotal * config.weight,
    };
  });
}

/**
 * Calculate grand totals from section totals.
 */
export function calculateGrandTotals(sectionTotals: SectionTotal[]): {
  selfTotalPoints: number;
  supervisorTotalPoints: number;
} {
  let selfTotalPoints = 0;
  let supervisorTotalPoints = 0;

  for (const st of sectionTotals) {
    selfTotalPoints += st.selfWeighted;
    supervisorTotalPoints += st.supervisorWeighted;
  }

  return { selfTotalPoints, supervisorTotalPoints };
}

/**
 * Determine the evaluation grade from total points.
 * Uses supervisor total points (the authoritative score).
 */
export function determineGrade(supervisorTotalPoints: number): EvaluationGrade {
  for (const threshold of EVALUATION_GRADE_THRESHOLDS) {
    if (supervisorTotalPoints >= threshold.min) {
      return threshold.grade as EvaluationGrade;
    }
  }
  return "unsatisfactory";
}

/**
 * Determine if a grade is positive (good or above).
 */
export function isPositiveGrade(grade: EvaluationGrade): boolean {
  return grade === "outstanding" || grade === "very-good" || grade === "good";
}

/**
 * Build the initial ratings array with all 19 criteria and null ratings.
 */
export function buildEmptyRatings(): CriterionRating[] {
  const ratings: CriterionRating[] = [];

  for (const section of [1, 2, 3] as const) {
    for (const criterion of EVALUATION_CRITERIA[section].criteria) {
      ratings.push({
        criterionKey: criterion.key,
        selfRating: null,
        supervisorRating: null,
      });
    }
  }

  return ratings;
}

/**
 * Compute all derived fields from ratings.
 * Returns sectionTotals, grand totals, grade, and isPositive.
 */
export function computeEvaluationResults(ratings: CriterionRating[]) {
  const sectionTotals = calculateSectionTotals(ratings);
  const { selfTotalPoints, supervisorTotalPoints } =
    calculateGrandTotals(sectionTotals);
  const grade = determineGrade(supervisorTotalPoints);
  const isPositive = isPositiveGrade(grade);

  return {
    sectionTotals,
    selfTotalPoints,
    supervisorTotalPoints,
    grade,
    isPositive,
  };
}
