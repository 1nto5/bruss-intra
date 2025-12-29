import { dbc } from '@/lib/db/mongo';
import type { AnalysisParams, ParetoResponse, TrendResponse } from './types';

function getWeekDates(year: number, week: number): { from: Date; to: Date } {
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7;
  const weekStart = new Date(jan4);
  weekStart.setDate(jan4.getDate() - jan4Day + 1 + (week - 1) * 7);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  return { from: weekStart, to: weekEnd };
}

function getMonthDates(year: number, month: number): { from: Date; to: Date } {
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 1);
  return { from, to };
}

function getQuarterDates(
  year: number,
  quarter: number,
): { from: Date; to: Date } {
  const startMonth = (quarter - 1) * 3;
  const from = new Date(year, startMonth, 1);
  const to = new Date(year, startMonth + 3, 1);
  return { from, to };
}

function getYearDates(year: number): { from: Date; to: Date } {
  const from = new Date(year, 0, 1);
  const to = new Date(year + 1, 0, 1);
  return { from, to };
}

function getDateRange(params: AnalysisParams): { from: Date; to: Date } {
  switch (params.mode) {
    case 'week':
      return getWeekDates(params.year, params.week);
    case 'month':
      return getMonthDates(params.year, params.month);
    case 'quarter':
      return getQuarterDates(params.year, params.quarter);
    case 'year':
      return getYearDates(params.year);
    case 'range': {
      const from = new Date(params.from);
      const to = new Date(params.to);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }
  }
}

export async function getParetoData(
  params: AnalysisParams,
): Promise<ParetoResponse> {
  const { from, to } = getDateRange(params);

  const deviationsCollection = await dbc('deviations');
  const configCollection = await dbc('deviations_configs');

  // Fetch reason translations
  const configDoc = await configCollection.findOne({
    config: 'reason_options',
  });
  const reasonOptions = configDoc?.options || [];

  // Aggregation pipeline
  const pipeline = [
    {
      $match: {
        createdAt: { $gte: from, $lt: to },
        status: { $ne: 'draft' },
      },
    },
    {
      $group: {
        _id: '$reason',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 as const } },
  ];

  const results = await deviationsCollection.aggregate(pipeline).toArray();

  // Calculate totals and cumulative percentages
  const total = results.reduce((sum, r) => sum + (r.count as number), 0);
  let cumulative = 0;

  const paretoData = results.map((item) => {
    const percentage = total > 0 ? ((item.count as number) / total) * 100 : 0;
    cumulative += percentage;
    return {
      reason: item._id as string,
      count: item.count as number,
      percentage: Math.round(percentage * 10) / 10,
      cumulative: Math.round(cumulative * 10) / 10,
    };
  });

  // Build translations map
  const reasonTranslations: Record<
    string,
    { en: string; pl: string; de?: string }
  > = {};
  for (const opt of reasonOptions) {
    reasonTranslations[opt.value] = {
      en: opt.label,
      pl: opt.pl || opt.label,
      de: opt.de || opt.label,
    };
  }

  return {
    data: paretoData,
    total,
    reasonTranslations,
    dateRange: { from: from.toISOString(), to: to.toISOString() },
  };
}

export async function getTrendData(
  params: AnalysisParams,
): Promise<TrendResponse> {
  const { from, to } = getDateRange(params);

  const deviationsCollection = await dbc('deviations');

  // Aggregation pipeline - group by ISO week
  const pipeline = [
    {
      $match: {
        createdAt: { $gte: from, $lt: to },
        status: { $ne: 'draft' },
      },
    },
    {
      $group: {
        _id: {
          year: { $isoWeekYear: '$createdAt' },
          week: { $isoWeek: '$createdAt' },
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: {
        '_id.year': 1 as const,
        '_id.week': 1 as const,
      },
    },
  ];

  const results = await deviationsCollection.aggregate(pipeline).toArray();

  const trendData = results.map((item) => ({
    week: `W${String(item._id.week).padStart(2, '0')}`,
    year: item._id.year as number,
    weekNumber: item._id.week as number,
    count: item.count as number,
  }));

  return {
    data: trendData,
    dateRange: { from: from.toISOString(), to: to.toISOString() },
  };
}
