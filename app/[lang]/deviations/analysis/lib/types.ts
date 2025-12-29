export type AnalysisMode = 'week' | 'month' | 'quarter' | 'year' | 'range';

export type AnalysisParams =
  | { mode: 'week'; year: number; week: number }
  | { mode: 'month'; year: number; month: number }
  | { mode: 'quarter'; year: number; quarter: number }
  | { mode: 'year'; year: number }
  | { mode: 'range'; from: string; to: string };

export type ParetoDataPoint = {
  reason: string;
  count: number;
  percentage: number;
  cumulative: number;
};

export type ParetoResponse = {
  data: ParetoDataPoint[];
  total: number;
  reasonTranslations: Record<string, { en: string; pl: string; de?: string }>;
  dateRange: { from: string; to: string };
};

export type TrendDataPoint = {
  week: string;
  year: number;
  weekNumber: number;
  count: number;
};

export type TrendResponse = {
  data: TrendDataPoint[];
  dateRange: { from: string; to: string };
};
