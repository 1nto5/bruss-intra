import type {
  CompetencyRating,
  CompetencyType,
  RequiredCompetency,
  MatchColor,
} from './types';
import {
  calculateMatchPercentage,
  getMatchColor,
  getMatchBadgeVariant,
} from './calculations';

// ── Position requirements (via API) ─────────────────────────────────

/** Normalize position names for reliable matching (trim, lowercase, collapse whitespace around separators). */
function normalizePositionName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ');
}

export async function fetchPositionRequirements(): Promise<
  Map<string, RequiredCompetency[]>
> {
  const res = await fetch(
    `${process.env.API}/competency-matrix/positions?active=true`,
    {
      next: { revalidate: 28800, tags: ['competency-matrix-positions'] },
    },
  );

  if (!res.ok) {
    throw new Error(
      `fetchPositionRequirements error: ${res.status} ${res.statusText}`,
    );
  }

  const positions = await res.json();

  const map = new Map<string, RequiredCompetency[]>();
  for (const p of positions) {
    const namePl = p.name?.pl;
    if (namePl) {
      map.set(
        normalizePositionName(namePl),
        p.requiredCompetencies as RequiredCompetency[],
      );
    }
  }
  return map;
}

/**
 * Look up position requirements by raw position name.
 * Applies the same normalization used when building the map.
 */
export function getPositionRequirements(
  positionReqMap: Map<string, RequiredCompetency[]>,
  positionName: string | undefined | null,
): RequiredCompetency[] | undefined {
  if (!positionName) return undefined;
  return positionReqMap.get(normalizePositionName(positionName));
}

// ── Employee ratings (via API) ──────────────────────────────────────

export type EmployeeRatingsResult = {
  employeeIdentifier: string;
  ratings: CompetencyRating[];
};

export async function fetchEmployeeRatings(
  identifier: string,
): Promise<CompetencyRating[]> {
  const res = await fetch(
    `${process.env.API}/competency-matrix/employee-ratings?identifier=${identifier}`,
    {
      next: {
        revalidate: 28800,
        tags: ['competency-matrix-employee-ratings'],
      },
    },
  );

  if (!res.ok) {
    throw new Error(
      `fetchEmployeeRatings error: ${res.status} ${res.statusText}`,
    );
  }

  const doc = await res.json();
  return (doc?.ratings as CompetencyRating[]) ?? [];
}

export async function fetchBulkEmployeeRatings(
  identifiers: string[],
): Promise<Map<string, CompetencyRating[]>> {
  if (identifiers.length === 0) return new Map();

  const res = await fetch(
    `${process.env.API}/competency-matrix/employee-ratings?identifiers=${identifiers.join(',')}`,
    {
      next: {
        revalidate: 28800,
        tags: ['competency-matrix-employee-ratings'],
      },
    },
  );

  if (!res.ok) {
    throw new Error(
      `fetchBulkEmployeeRatings error: ${res.status} ${res.statusText}`,
    );
  }

  const docs = await res.json();

  const map = new Map<string, CompetencyRating[]>();
  for (const doc of docs) {
    map.set(
      doc.employeeIdentifier as string,
      doc.ratings as CompetencyRating[],
    );
  }
  return map;
}

// ── Active competencies (via API) ───────────────────────────────────

export async function fetchActiveCompetencies(): Promise<CompetencyType[]> {
  const res = await fetch(
    `${process.env.API}/competency-matrix/competencies?active=true`,
    {
      next: {
        revalidate: 28800,
        tags: ['competency-matrix-competencies'],
      },
    },
  );

  if (!res.ok) {
    throw new Error(
      `fetchActiveCompetencies error: ${res.status} ${res.statusText}`,
    );
  }

  return res.json();
}

// ── Match computation helper ────────────────────────────────────────

export function computeEmployeeMatch(
  ratings: CompetencyRating[],
  requirements: RequiredCompetency[],
): {
  matchPercent: number;
  color: MatchColor;
  badgeVariant: 'statusApproved' | 'statusPending' | 'statusRejected';
} {
  const matchPercent = calculateMatchPercentage(ratings, requirements);
  const color = getMatchColor(matchPercent);
  const badgeVariant = getMatchBadgeVariant(color);
  return { matchPercent, color, badgeVariant };
}
