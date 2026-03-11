import { OeeFault, OeeParams } from "../../lib/types";

export type FailureBreakdownByType = {
  faultKey: string;
  faultName: string;
  count: number;
  totalMinutes: number;
  percentage: number;
  avgDuration: number;
};

export type FailureBreakdownByOven = {
  oven: string;
  count: number;
  totalMinutes: number;
  percentage: number;
};

export type FailureTrendPoint = {
  timestamp: string;
  failureCount: number;
  failureMinutes: number;
};

export type FailureStatisticsSummary = {
  totalFailures: number;
  totalFailureHours: number;
  totalAvailableHours: number;
  failureRate: number;
  avgFailureDuration: number;
  mostCommonFaultKey: string;
  mostCommonFaultName: string;
};

export type FailureStatisticsResponse = {
  summary: FailureStatisticsSummary;
  breakdownByType: FailureBreakdownByType[];
  breakdownByOven: FailureBreakdownByOven[];
  trendData: FailureTrendPoint[];
  detailedRecords: any[];
  faultTranslations: Record<string, any>;
};

// Re-export OeeParams for convenience
export type { OeeParams };
