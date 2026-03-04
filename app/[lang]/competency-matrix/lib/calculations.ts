import type { CompetencyRating, RequiredCompetency, MatchColor } from './types';
import { MATCH_THRESHOLDS } from './constants';

/**
 * Primary metric - weighted match percentage.
 * matchPercentage = sum(min(actual, required) * weight) / sum(required * weight) * 100
 *
 * Ignores competencies with rating === null (n/a).
 */
export function calculateMatchPercentage(
  ratings: CompetencyRating[],
  requirements: RequiredCompetency[],
): number {
  const ratingMap = new Map(
    ratings
      .filter((r) => r.rating !== null)
      .map((r) => [r.competencyId, r.rating as number]),
  );

  let numerator = 0;
  let denominator = 0;

  for (const req of requirements) {
    const actual = ratingMap.get(req.competencyId);
    if (actual === undefined) continue; // skip if not rated

    numerator += Math.min(actual, req.requiredLevel) * req.weight;
    denominator += req.requiredLevel * req.weight;
  }

  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

/**
 * Secondary metric - Excel-compatible gap ratio.
 * gapRatio = SUM(diffs) / (totalPoints - SUM(diffs))
 * where diffs = max(0, required - actual) per competency
 */
export function calculateGapRatio(
  ratings: CompetencyRating[],
  requirements: RequiredCompetency[],
): number {
  const ratingMap = new Map(
    ratings
      .filter((r) => r.rating !== null)
      .map((r) => [r.competencyId, r.rating as number]),
  );

  let totalDiffs = 0;
  let totalPoints = 0;

  for (const req of requirements) {
    const actual = ratingMap.get(req.competencyId) ?? 0;
    totalPoints += actual;
    totalDiffs += Math.max(0, req.requiredLevel - actual);
  }

  const divisor = totalPoints - totalDiffs;
  if (divisor <= 0) return totalDiffs > 0 ? Infinity : 0;
  return Math.round((totalDiffs / divisor) * 100) / 100;
}

/**
 * Count competencies where actual < required.
 */
export function countGaps(
  ratings: CompetencyRating[],
  requirements: RequiredCompetency[],
): number {
  const ratingMap = new Map(
    ratings
      .filter((r) => r.rating !== null)
      .map((r) => [r.competencyId, r.rating as number]),
  );

  let count = 0;
  for (const req of requirements) {
    const actual = ratingMap.get(req.competencyId) ?? 0;
    if (actual < req.requiredLevel) count++;
  }
  return count;
}

/**
 * Count critical gaps: required >= 2 AND actual <= 1.
 */
export function countCriticalGaps(
  ratings: CompetencyRating[],
  requirements: RequiredCompetency[],
): number {
  const ratingMap = new Map(
    ratings
      .filter((r) => r.rating !== null)
      .map((r) => [r.competencyId, r.rating as number]),
  );

  let count = 0;
  for (const req of requirements) {
    if (req.requiredLevel >= 2) {
      const actual = ratingMap.get(req.competencyId) ?? 0;
      if (actual <= 1) count++;
    }
  }
  return count;
}

/**
 * Map match percentage to a color.
 */
export function getMatchColor(matchPercentage: number): MatchColor {
  if (matchPercentage >= MATCH_THRESHOLDS.green) return 'green';
  if (matchPercentage >= MATCH_THRESHOLDS.yellow) return 'yellow';
  return 'red';
}

/**
 * Map match color to badge variant name for the UI.
 */
export function getMatchBadgeVariant(
  color: MatchColor,
): 'statusApproved' | 'statusPending' | 'statusRejected' {
  switch (color) {
    case 'green':
      return 'statusApproved';
    case 'yellow':
      return 'statusPending';
    case 'red':
      return 'statusRejected';
  }
}
