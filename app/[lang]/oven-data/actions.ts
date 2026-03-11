"use server";

import { revalidateTag } from "next/cache";

export async function revalidateOvenTableData() {
  revalidateTag("oven-data-processes", { expire: 0 });
}

export async function revalidateOvenTemperatureData() {
  revalidateTag("oven-data-temperature", { expire: 0 });
}
