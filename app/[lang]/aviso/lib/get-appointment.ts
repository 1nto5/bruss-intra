import { notFound } from "next/navigation";
import type { AppointmentType, HistoryEntry } from "./types";

export async function getAppointment(
  id: string,
): Promise<{ appointment: AppointmentType; history: HistoryEntry[] }> {
  const res = await fetch(`${process.env.API}/aviso/appointment?id=${id}`, {
    next: { tags: ["aviso-appointments"] },
    cache: "no-store",
  });

  if (res.status === 404) {
    notFound();
  }

  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `getAppointment error: ${res.status} ${res.statusText} ${json.error}`,
    );
  }

  return res.json();
}
