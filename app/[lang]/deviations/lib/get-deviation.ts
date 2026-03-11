import { notFound } from "next/navigation";
import { DeviationType } from "./types";

export async function getDeviation(id: string): Promise<{
  fetchTime: Date;
  deviation: DeviationType;
}> {
  const res = await fetch(`${process.env.API}/deviations/deviation?id=${id}`, {
    // next: { revalidate: 15, tags: ['deviation'] },
    next: { tags: ["deviation"] },
    cache: "no-store",
  });

  if (res.status === 404) {
    notFound();
  }

  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `getDeviation error:  ${res.status}  ${res.statusText} ${json.error}`,
    );
  }

  const fetchTime = new Date(res.headers.get("date") || "");

  const data = await res.json();
  return { fetchTime, deviation: data };
}
