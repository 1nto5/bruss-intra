"use server";

import { formatDateTime } from "@/lib/utils/date-format";
import { OvenProcessDataType } from "./types";

export async function getOvenProcesses(
  searchParams: { [key: string]: string | undefined } = {},
): Promise<{
  fetchTimeLocaleString: string;
  fetchTime: Date;
  data: OvenProcessDataType[];
}> {
  const filteredSearchParams = Object.fromEntries(
    Object.entries(searchParams).filter(
      ([_, value]) => value !== undefined,
    ) as [string, string][],
  );

  const queryParams = new URLSearchParams(filteredSearchParams).toString();
  const url = `${process.env.API}oven-data/processes?${queryParams}`;

  const res = await fetch(url, {
    next: { revalidate: 0, tags: ["oven-data-processes"] },
  });

  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `getOvenProcesses error:  ${res.status}  ${res.statusText} ${json.error}`,
    );
  }

  const fetchTime = new Date(res.headers.get("date") || "");
  const fetchTimeLocaleString = formatDateTime(fetchTime);

  let data: OvenProcessDataType[] = await res.json();
  data = data.map((item) => ({
    ...item,
    startTime: new Date(item.startTime),
    endTime: item.endTime ? new Date(item.endTime) : null,
    startTimeLocaleString: formatDateTime(item.startTime),
    endTimeLocaleString: item.endTime ? formatDateTime(item.endTime) : "",
  }));
  return { fetchTimeLocaleString, fetchTime, data };
}
