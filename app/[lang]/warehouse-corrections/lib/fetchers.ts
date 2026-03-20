import type {
  CorrectionDoc,
  CorrectionStatistics,
  CorrectionWithDetails,
  QuarryType,
  ReasonType,
  WarehouseType,
} from "./types";

export async function fetchCorrections(
  searchParams: Record<string, string | undefined>,
): Promise<CorrectionDoc[]> {
  const filteredParams = Object.fromEntries(
    Object.entries(searchParams).filter(
      ([_, value]) => value !== undefined,
    ) as [string, string][],
  );
  const queryString = new URLSearchParams(filteredParams).toString();
  const res = await fetch(
    `${process.env.API}/warehouse-corrections?${queryString}`,
    { next: { revalidate: 0, tags: ["warehouse-corrections"] } },
  );
  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `fetchCorrections error: ${res.status} ${res.statusText} ${json.error}`,
    );
  }
  return res.json();
}

export async function fetchCorrection(
  id: string,
): Promise<CorrectionWithDetails> {
  const res = await fetch(
    `${process.env.API}/warehouse-corrections/${id}`,
    { next: { revalidate: 0, tags: ["warehouse-corrections"] } },
  );
  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `fetchCorrection error: ${res.status} ${res.statusText} ${json.error}`,
    );
  }
  return res.json();
}

export async function fetchWarehouses(): Promise<WarehouseType[]> {
  const res = await fetch(
    `${process.env.API}/warehouse-corrections/warehouses`,
    { next: { revalidate: 3600, tags: ["warehouse-corrections-warehouses"] } },
  );
  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `fetchWarehouses error: ${res.status} ${res.statusText} ${json.error}`,
    );
  }
  return res.json();
}

export async function fetchQuarries(): Promise<QuarryType[]> {
  const res = await fetch(
    `${process.env.API}/warehouse-corrections/quarries`,
    { next: { revalidate: 3600, tags: ["warehouse-corrections-quarries"] } },
  );
  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `fetchQuarries error: ${res.status} ${res.statusText} ${json.error}`,
    );
  }
  return res.json();
}

export async function fetchReasons(): Promise<ReasonType[]> {
  const res = await fetch(
    `${process.env.API}/warehouse-corrections/reasons`,
    { next: { revalidate: 3600, tags: ["warehouse-corrections-reasons"] } },
  );
  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `fetchReasons error: ${res.status} ${res.statusText} ${json.error}`,
    );
  }
  return res.json();
}

export async function fetchPendingApprovals(
  userRoles: string[],
): Promise<(CorrectionDoc & { pendingApprovals: unknown[] })[]> {
  const res = await fetch(
    `${process.env.API}/warehouse-corrections/approvals?roles=${userRoles.join(",")}`,
    { next: { revalidate: 0, tags: ["warehouse-corrections-approvals"] } },
  );
  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `fetchPendingApprovals error: ${res.status} ${res.statusText} ${json.error}`,
    );
  }
  return res.json();
}

export async function fetchStatistics(
  searchParams?: Record<string, string | undefined>,
): Promise<CorrectionStatistics> {
  const filteredParams = searchParams
    ? Object.fromEntries(
        Object.entries(searchParams).filter(
          ([_, value]) => value !== undefined,
        ) as [string, string][],
      )
    : {};
  const queryString = new URLSearchParams(filteredParams).toString();
  const res = await fetch(
    `${process.env.API}/warehouse-corrections/statistics?${queryString}`,
    { next: { revalidate: 60, tags: ["warehouse-corrections-statistics"] } },
  );
  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `fetchStatistics error: ${res.status} ${res.statusText} ${json.error}`,
    );
  }
  return res.json();
}
