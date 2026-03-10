import { DeviationReasonType } from "./types";

export async function getConfigReasonOptions(): Promise<DeviationReasonType[]> {
  const res = await fetch(
    `${process.env.API}/deviations/config/reason-options`,
    {
      next: { revalidate: 60 * 60 * 8, tags: ["deviations-reason-options"] },
      // change to 0
      // next: { revalidate: 0, tags: ['deviations-reason-options'] },
    },
  );

  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `getReasons error:  ${res.status}  ${res.statusText} ${json.error}`,
    );
  }
  const data = await res.json();
  return data;
}

export async function getConfigAreaOptions(): Promise<DeviationReasonType[]> {
  const res = await fetch(`${process.env.API}/deviations/config/area-options`, {
    next: { revalidate: 60 * 60 * 8, tags: ["deviations-area-options"] },
    // change to 0
    // next: { revalidate: 0, tags: ['deviations-area-options'] },
  });

  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `getReasons error:  ${res.status}  ${res.statusText} ${json.error}`,
    );
  }
  const data = await res.json();
  return data;
}
