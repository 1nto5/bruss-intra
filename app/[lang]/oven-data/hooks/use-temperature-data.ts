import { useQuery } from "@tanstack/react-query";
import { OvenProcessDataType, OvenTemperatureLogType } from "../lib/types";

async function fetchTemperatureData(
  processId: string,
  params: Record<string, any>,
): Promise<OvenTemperatureLogType[]> {
  const searchParams = new URLSearchParams({
    process_id: processId,
    ...Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== undefined),
    ),
  });

  const response = await fetch(`/api/oven-data/temperature?${searchParams}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch temperature data: ${response.status}`);
  }

  return response.json();
}

export function useTemperatureData(
  selectedProcess: OvenProcessDataType | null,
) {
  return useQuery({
    queryKey: ["temperature", selectedProcess?.id, selectedProcess?.oven],
    queryFn: async () => {
      if (!selectedProcess) return [];

      return fetchTemperatureData(selectedProcess.id, {
        from: selectedProcess.startTime.toISOString(),
        to: selectedProcess.endTime?.toISOString(),
        oven: selectedProcess.oven,
      });
    },
    enabled: !!selectedProcess,
    staleTime: 1000 * 30, // Cache for 30 seconds
    gcTime: 1000 * 60 * 5, // Keep in garbage collection for 5 minutes
  });
}
