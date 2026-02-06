import type { OeeResponse, OeeFault } from '@/app/[lang]/oven-data/lib/types';
import { dbc } from '@/lib/db/mongo';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Get all configured ovens from the database
 */
async function getConfiguredOvens(): Promise<string[]> {
  const ovenConfigsCollection = await dbc('oven_controllino_configs');
  const configs = await ovenConfigsCollection.find({}).toArray();
  return configs.map((config) => config.oven);
}

/**
 * Get the start and end date of a specific week in a year (ISO 8601 week date)
 */
function getWeekDates(year: number, week: number): { from: Date; to: Date } {
  // ISO 8601: Week 1 is the week with the year's first Thursday
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7; // Convert Sunday (0) to 7
  const weekStart = new Date(jan4);
  weekStart.setDate(jan4.getDate() - jan4Day + 1 + (week - 1) * 7);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  return { from: weekStart, to: weekEnd };
}

/**
 * Get the start and end date of a specific month in a year
 */
function getMonthDates(year: number, month: number): { from: Date; to: Date } {
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 1);
  return { from, to };
}

/**
 * Get the start and end of a specific day
 */
function getDayDates(date: Date): { from: Date; to: Date } {
  const from = new Date(date);
  from.setHours(0, 0, 0, 0);

  const to = new Date(date);
  to.setHours(23, 59, 59, 999);

  return { from, to };
}

/**
 * Determine appropriate granularity based on date range
 */
function getAutoGranularity(from: Date, to: Date): 'hour' | 'day' {
  const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays <= 2) return 'hour'; // Single day or 2 days: hourly
  return 'day'; // Longer periods: daily
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Determine the mode and date range
    let from: Date;
    let to: Date;
    let granularity: 'hour' | 'day';

    const mode = searchParams.get('mode') || 'range';

    switch (mode) {
      case 'week': {
        // Week mode: ?mode=week&year=2025&week=23
        const year = parseInt(searchParams.get('year') || '');
        const week = parseInt(searchParams.get('week') || '');

        if (isNaN(year) || isNaN(week) || week < 1 || week > 53) {
          return NextResponse.json(
            { error: 'Invalid year or week number. Week must be 1-53.' },
            { status: 400 },
          );
        }

        const dates = getWeekDates(year, week);
        from = dates.from;
        to = dates.to;
        granularity = 'day'; // Weekly view uses daily granularity
        break;
      }

      case 'month': {
        // Month mode: ?mode=month&year=2025&month=1
        const year = parseInt(searchParams.get('year') || '');
        const month = parseInt(searchParams.get('month') || '');

        if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
          return NextResponse.json(
            { error: 'Invalid year or month. Month must be 1-12.' },
            { status: 400 },
          );
        }

        const dates = getMonthDates(year, month);
        from = dates.from;
        to = dates.to;
        granularity = 'day'; // Monthly view uses daily granularity
        break;
      }

      case 'day': {
        // Day mode: ?mode=day&date=2025-01-15
        const dateParam = searchParams.get('date');
        if (!dateParam) {
          return NextResponse.json(
            { error: 'Missing date parameter for day mode' },
            { status: 400 },
          );
        }

        const date = new Date(dateParam);
        if (isNaN(date.getTime())) {
          return NextResponse.json(
            { error: 'Invalid date format' },
            { status: 400 },
          );
        }

        const dates = getDayDates(date);
        from = dates.from;
        to = dates.to;
        granularity = 'hour'; // Daily view uses hourly granularity
        break;
      }

      case 'range':
      default: {
        // Range mode: ?mode=range&from=2025-01-01&to=2025-01-31
        const fromParam = searchParams.get('from');
        const toParam = searchParams.get('to');

        if (!fromParam || !toParam) {
          return NextResponse.json(
            { error: 'Missing required parameters: from and to' },
            { status: 400 },
          );
        }

        from = new Date(fromParam);
        to = new Date(toParam);

        if (isNaN(from.getTime()) || isNaN(to.getTime())) {
          return NextResponse.json(
            { error: 'Invalid date format' },
            { status: 400 },
          );
        }

        // Set from to start of day and to to end of day
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);

        // Auto-determine granularity based on range length
        const explicitGranularity = searchParams.get('granularity');
        if (explicitGranularity === 'hour' || explicitGranularity === 'day') {
          granularity = explicitGranularity;
        } else {
          granularity = getAutoGranularity(from, to);
        }
        break;
      }
    }

    // Get all configured ovens from database
    const configuredOvens = await getConfiguredOvens();
    const totalOvens = configuredOvens.length;

    if (totalOvens === 0) {
      return NextResponse.json(
        { error: 'No ovens configured in the system' },
        { status: 500 },
      );
    }

    // Determine bucket size in milliseconds
    const bucketMs = granularity === 'hour' ? 3600000 : 86400000; // 1 hour or 1 day
    const bucketMinutes = bucketMs / 60000;

    const processCollection = await dbc('oven_processes');
    const faultsCollection = await dbc('oven_fault_reports');

    const dataPoints = [];
    const allFaults: OeeFault[] = [];

    // Iterate through time buckets
    let bucketStart = new Date(from);

    while (bucketStart < to) {
      const bucketEnd = new Date(bucketStart.getTime() + bucketMs);

      // Find all processes that overlap with this time bucket
      // A process overlaps if:
      // 1. It's finished AND (startTime < bucketEnd AND endTime > bucketStart)
      // 2. It's running AND startTime < bucketEnd
      const processes = await processCollection
        .find({
          $or: [
            {
              status: 'finished',
              startTime: { $lt: bucketEnd },
              endTime: { $gt: bucketStart },
            },
            {
              status: 'running',
              startTime: { $lt: bucketEnd },
            },
          ],
        })
        .toArray();

      // Find all faults that overlap with this time bucket
      // Similar logic to processes:
      // 1. It's finished AND (startTime < bucketEnd AND endTime > bucketStart)
      // 2. It's active AND startTime < bucketEnd
      const faults = await faultsCollection
        .find({
          $or: [
            {
              status: 'finished',
              startTime: { $lt: bucketEnd },
              endTime: { $gt: bucketStart },
            },
            {
              status: 'active',
              startTime: { $lt: bucketEnd },
            },
          ],
        })
        .toArray();

      // Calculate total running minutes for this bucket across all ovens
      // Group processes by oven to avoid double-counting overlapping processes on same oven
      const ovenProcesses = new Map<string, typeof processes>();

      for (const process of processes) {
        if (!ovenProcesses.has(process.oven)) {
          ovenProcesses.set(process.oven, []);
        }
        ovenProcesses.get(process.oven)!.push(process);
      }

      let totalRunningMinutes = 0;
      const activeOvens = new Set<string>();

      // Calculate running time per oven
      for (const [oven, ovenProcs] of ovenProcesses) {
        // Create time intervals for this oven's processes
        const intervals: Array<{ start: Date; end: Date }> = [];

        for (const process of ovenProcs) {
          const processStart = new Date(process.startTime);
          const processEnd = process.endTime
            ? new Date(process.endTime)
            : new Date(); // For running processes, use current time

          // Calculate the overlap between process time and bucket time
          const overlapStart =
            processStart > bucketStart ? processStart : bucketStart;
          const overlapEnd = processEnd < bucketEnd ? processEnd : bucketEnd;

          if (overlapEnd > overlapStart) {
            intervals.push({ start: overlapStart, end: overlapEnd });
          }
        }

        // Merge overlapping intervals for this oven
        if (intervals.length > 0) {
          intervals.sort((a, b) => a.start.getTime() - b.start.getTime());

          const merged: Array<{ start: Date; end: Date }> = [intervals[0]];

          for (let i = 1; i < intervals.length; i++) {
            const current = intervals[i];
            const lastMerged = merged[merged.length - 1];

            if (current.start <= lastMerged.end) {
              // Overlapping intervals - merge them
              lastMerged.end = new Date(
                Math.max(lastMerged.end.getTime(), current.end.getTime()),
              );
            } else {
              // Non-overlapping - add as new interval
              merged.push(current);
            }
          }

          // Sum up the merged intervals
          for (const interval of merged) {
            const durationMs =
              interval.end.getTime() - interval.start.getTime();
            totalRunningMinutes += durationMs / 60000;
          }

          activeOvens.add(oven);
        }
      }

      // Calculate failure time per oven and adjust available capacity
      const ovenFailureMinutes = new Map<string, number>();
      let totalFailureMinutes = 0;

      for (const fault of faults) {
        const faultStart = new Date(fault.startTime);
        // For active faults, use current time as end (like running processes)
        const faultEnd = fault.endTime
          ? new Date(fault.endTime)
          : new Date();

        // Calculate overlap with bucket
        const overlapStart =
          faultStart > bucketStart ? faultStart : bucketStart;
        const overlapEnd = faultEnd < bucketEnd ? faultEnd : bucketEnd;

        if (overlapEnd > overlapStart) {
          const overlapMinutes =
            (overlapEnd.getTime() - overlapStart.getTime()) / 60000;

          // Add to this oven's failure time
          const currentFailureTime = ovenFailureMinutes.get(fault.oven) || 0;
          ovenFailureMinutes.set(fault.oven, currentFailureTime + overlapMinutes);
        }

        // Track all faults for response (only once, not per bucket)
        if (
          !allFaults.some(
            (f) => f.id === fault._id.toString() || f.id === fault.id,
          )
        ) {
          allFaults.push({
            id: fault._id?.toString() || fault.id,
            oven: fault.oven,
            faultKey: fault.faultKey,
            faultName: fault.faultKey, // Will be translated in UI
            status: fault.status,
            startTime: faultStart,
            endTime: fault.endTime ? new Date(fault.endTime) : null,
            duration: faultEnd
              ? (faultEnd.getTime() - faultStart.getTime()) / 60000
              : (new Date().getTime() - faultStart.getTime()) / 60000,
            reportedBy: fault.reportedBy || [],
            finishedBy: fault.finishedBy || null,
          });
        }
      }

      // Calculate adjusted available capacity per oven
      let adjustedAvailableMinutes = 0;

      for (const oven of configuredOvens) {
        const ovenFailureTime = ovenFailureMinutes.get(oven) || 0;
        const ovenAvailableMinutes = bucketMinutes - ovenFailureTime;
        adjustedAvailableMinutes += ovenAvailableMinutes;
        totalFailureMinutes += ovenFailureTime;
      }

      // Calculate utilization with adjusted capacity
      const utilizationPercent =
        adjustedAvailableMinutes > 0
          ? (totalRunningMinutes / adjustedAvailableMinutes) * 100
          : 0;

      // Count active faults in this bucket
      const activeFaultCount = faults.filter((f) => f.status === 'active')
        .length;

      dataPoints.push({
        timestamp: bucketStart.toISOString(),
        runningMinutes: Math.round(totalRunningMinutes),
        availableMinutes: Math.round(adjustedAvailableMinutes),
        failureMinutes: Math.round(totalFailureMinutes),
        utilizationPercent: Math.round(utilizationPercent * 10) / 10,
        activeOvenCount: activeOvens.size,
        faultCount: activeFaultCount,
      });

      // Move to next bucket
      bucketStart = bucketEnd;
    }

    // Calculate overall summary statistics
    const totalRunningMinutes = dataPoints.reduce(
      (sum, dp) => sum + dp.runningMinutes,
      0,
    );
    const totalAvailableMinutes = dataPoints.reduce(
      (sum, dp) => sum + dp.availableMinutes,
      0,
    );
    const totalFailureMinutes = dataPoints.reduce(
      (sum, dp) => sum + dp.failureMinutes,
      0,
    );
    const overallUtilization =
      totalAvailableMinutes > 0
        ? (totalRunningMinutes / totalAvailableMinutes) * 100
        : 0;

    const response: OeeResponse = {
      dataPoints,
      summary: {
        overallUtilization: Math.round(overallUtilization * 10) / 10,
        totalRunningHours: Math.round(totalRunningMinutes / 60),
        totalAvailableHours: Math.round(totalAvailableMinutes / 60),
        totalFailureHours: Math.round(totalFailureMinutes / 60),
        totalFaults: allFaults.length,
      },
      faults: allFaults,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('OEE API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch OEE data' },
      { status: 500 },
    );
  }
}
