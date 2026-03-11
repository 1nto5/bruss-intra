import { useQuery } from "@tanstack/react-query";
import { OeeParams, OeeResponse } from "../lib/types";

async function fetchOeeData(params: OeeParams): Promise<OeeResponse> {
  const searchParams = new URLSearchParams();

  switch (params.mode) {
    case "day":
      searchParams.set("mode", "day");
      searchParams.set("date", params.date);
      break;
    case "week":
      searchParams.set("mode", "week");
      searchParams.set("year", params.year.toString());
      searchParams.set("week", params.week.toString());
      break;
    case "month":
      searchParams.set("mode", "month");
      searchParams.set("year", params.year.toString());
      searchParams.set("month", params.month.toString());
      break;
    case "range":
      searchParams.set("mode", "range");
      searchParams.set("from", params.from);
      searchParams.set("to", params.to);
      if (params.granularity) {
        searchParams.set("granularity", params.granularity);
      }
      break;
  }

  const response = await fetch(`/api/oven-data/oee?${searchParams}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch OEE data: ${response.status}`);
  }

  return response.json();
}

export function useOeeData(params: OeeParams | null) {
  return useQuery({
    queryKey: ["oee", params],
    queryFn: async () => {
      if (!params) return null;
      return fetchOeeData(params);
    },
    enabled: !!params,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    gcTime: 1000 * 60 * 10, // Keep in garbage collection for 10 minutes
  });
}
