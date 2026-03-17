import { ITInventoryItem } from "./types";
import {
  serializeAssignment,
  serializeAssignmentHistory,
} from "./serialize";

export async function getInventoryItems(
  searchParams: URLSearchParams,
): Promise<{ items: ITInventoryItem[]; fetchTime: Date }> {
  const res = await fetch(
    `${process.env.API}/it-inventory?${searchParams.toString()}`,
    {
      next: { revalidate: 0, tags: ["it-inventory"] },
    },
  );

  if (!res.ok) {
    console.error("getInventoryItems error:", res.status, res.statusText);
    return { items: [], fetchTime: new Date() };
  }

  const rawItems = await res.json();

  const items = rawItems.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (item: any) => ({
      ...item,
      _id: item._id?.$oid ?? item._id?.toString?.() ?? item._id,
      currentAssignment: serializeAssignment(item.currentAssignment),
      assignmentHistory: serializeAssignmentHistory(item.assignmentHistory),
    }),
  );

  return {
    items: items as ITInventoryItem[],
    fetchTime: new Date(res.headers.get("date") || new Date()),
  };
}
