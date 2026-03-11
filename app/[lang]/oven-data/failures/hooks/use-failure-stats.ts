"use client";

import { useQuery } from "@tanstack/react-query";
import type { FailureStatisticsResponse, OeeParams } from "../lib/types";

function buildQueryString(params: OeeParams): string {
  const searchParams = new URLSearchParams();

  switch (params.mode) {
    case "day":
      searchParams.set("mode", "day");
      searchParams.set("date", params.date);
      if (params.ovens && params.ovens.length > 0) {
        searchParams.set("oven", params.ovens.join(","));
      }
      break;
    case "week":
      searchParams.set("mode", "week");
      searchParams.set("year", params.year.toString());
      searchParams.set("week", params.week.toString());
      if (params.ovens && params.ovens.length > 0) {
        searchParams.set("oven", params.ovens.join(","));
      }
      break;
    case "month":
      searchParams.set("mode", "month");
      searchParams.set("year", params.year.toString());
      searchParams.set("month", params.month.toString());
      if (params.ovens && params.ovens.length > 0) {
        searchParams.set("oven", params.ovens.join(","));
      }
      break;
    case "range":
      searchParams.set("mode", "range");
      searchParams.set("from", params.from);
      searchParams.set("to", params.to);
      if (params.granularity) {
        searchParams.set("granularity", params.granularity);
      }
      if (params.ovens && params.ovens.length > 0) {
        searchParams.set("oven", params.ovens.join(","));
      }
      break;
  }

  return searchParams.toString();
}

export function useFailureStats(params: OeeParams) {
  return useQuery<FailureStatisticsResponse>({
    queryKey: ["failure-statistics", params],
    queryFn: async () => {
      const queryString = buildQueryString(params);
      const response = await fetch(`/api/oven-data/failures?${queryString}`);

      if (!response.ok) {
        throw new Error("Failed to fetch failure statistics");
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}
