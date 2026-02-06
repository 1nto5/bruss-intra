import { dbc } from '@/lib/db/mongo';
import type { Document, Filter } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { getFaultConfigs } from '@/lib/data/get-fault-configs';

/**
 * Get the start and end date of a specific week in a year (ISO 8601 week date)
 */
function getWeekDates(year: number, week: number): { from: Date; to: Date } {
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7;
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
 * For failure statistics, always use daily granularity
 */
function getAutoGranularity(from: Date, to: Date): 'hour' | 'day' {
  return 'day';
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
        const year = parseInt(searchParams.get('year') || '');
        const week = parseInt(searchParams.get('week') || '');

        if (isNaN(year) || isNaN(week) || week < 1 || week > 53) {
          return NextResponse.json(
            { error: 'Invalid year or week number' },
            { status: 400 },
          );
        }

        const dates = getWeekDates(year, week);
        from = dates.from;
        to = dates.to;
        granularity = 'day';
        break;
      }

      case 'month': {
        const year = parseInt(searchParams.get('year') || '');
        const month = parseInt(searchParams.get('month') || '');

        if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
          return NextResponse.json(
            { error: 'Invalid year or month' },
            { status: 400 },
          );
        }

        const dates = getMonthDates(year, month);
        from = dates.from;
        to = dates.to;
        granularity = 'day';
        break;
      }

      case 'day': {
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
        granularity = 'day';
        break;
      }

      case 'range':
      default: {
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

        const explicitGranularity = searchParams.get('granularity');
        if (explicitGranularity === 'hour' || explicitGranularity === 'day') {
          granularity = explicitGranularity;
        } else {
          granularity = getAutoGranularity(from, to);
        }
        break;
      }
    }

    const faultsCollection = await dbc('oven_fault_reports');
    const ovenConfigsCollection = await dbc('oven_controllino_configs');

    // Parse oven filter parameter
    const ovenParam = searchParams.get('oven');
    const selectedOvens = ovenParam
      ? ovenParam.split(',').map((o) => o.trim()).filter((o) => o.length > 0)
      : [];

    // Get total ovens for capacity calculation
    const totalOvensCount = await ovenConfigsCollection.countDocuments();

    // Build base filter for time range
    const baseFilter: Filter<Document> = {
      $or: [
        {
          status: 'finished',
          startTime: { $lt: to },
          endTime: { $gt: from },
        },
        {
          status: 'active',
          startTime: { $lt: to },
        },
      ],
    };

    // Add oven filter if specified
    if (selectedOvens.length > 0) {
      baseFilter.oven = { $in: selectedOvens };
    }

    // Find all faults in the time range (and optionally filtered by oven)
    const faults = await faultsCollection.find(baseFilter).toArray();

    // Get fault configs for translations (cached server-side)
    const allFaultConfigs = await getFaultConfigs();

    // Create lookup map for fault names
    const faultNameMap = new Map<string, Record<string, string>>();
    for (const config of allFaultConfigs) {
      faultNameMap.set(config.key, config.translations);
    }

    // Calculate statistics
    let totalFailures = 0;
    let totalFailureMinutes = 0;
    const breakdownByType = new Map<
      string,
      { count: number; totalMinutes: number }
    >();
    const breakdownByOven = new Map<
      string,
      { count: number; totalMinutes: number }
    >();
    const detailedRecords: { startTime: string; [key: string]: unknown }[] = [];

    for (const fault of faults) {
      const faultStart = new Date(fault.startTime);
      const faultEnd = fault.endTime ? new Date(fault.endTime) : new Date();

      // Calculate overlap with requested range
      const overlapStart = faultStart > from ? faultStart : from;
      const overlapEnd = faultEnd < to ? faultEnd : to;

      if (overlapEnd > overlapStart) {
        const durationMinutes =
          (overlapEnd.getTime() - overlapStart.getTime()) / 60000;

        totalFailures++;
        totalFailureMinutes += durationMinutes;

        // Breakdown by type
        if (!breakdownByType.has(fault.faultKey)) {
          breakdownByType.set(fault.faultKey, {
            count: 0,
            totalMinutes: 0,
          });
        }
        const typeData = breakdownByType.get(fault.faultKey)!;
        typeData.count++;
        typeData.totalMinutes += durationMinutes;

        // Breakdown by oven
        if (!breakdownByOven.has(fault.oven)) {
          breakdownByOven.set(fault.oven, { count: 0, totalMinutes: 0 });
        }
        const ovenData = breakdownByOven.get(fault.oven)!;
        ovenData.count++;
        ovenData.totalMinutes += durationMinutes;

        // Add to detailed records
        const fullDuration =
          (faultEnd.getTime() - faultStart.getTime()) / 60000;
        detailedRecords.push({
          id: fault._id.toString(),
          oven: fault.oven,
          faultKey: fault.faultKey,
          faultName: fault.faultKey, // Will be translated client-side
          status: fault.status,
          startTime: faultStart.toISOString(),
          endTime: fault.endTime ? new Date(fault.endTime).toISOString() : null,
          duration: Math.round(fullDuration),
          reportedBy: fault.reportedBy || [],
          finishedBy: fault.finishedBy || null,
        });
      }
    }

    // Calculate percentages and convert to arrays
    const breakdownByTypeArray = Array.from(breakdownByType.entries())
      .map(([faultKey, data]) => ({
        faultKey,
        faultName: faultKey, // Will be translated client-side
        count: data.count,
        totalMinutes: Math.round(data.totalMinutes),
        percentage:
          totalFailureMinutes > 0
            ? Math.round((data.totalMinutes / totalFailureMinutes) * 1000) /
              10
            : 0,
        avgDuration: Math.round(data.totalMinutes / data.count),
      }))
      .sort((a, b) => b.percentage - a.percentage);

    const breakdownByOvenArray = Array.from(breakdownByOven.entries())
      .map(([oven, data]) => ({
        oven,
        count: data.count,
        totalMinutes: Math.round(data.totalMinutes),
        percentage:
          totalFailureMinutes > 0
            ? Math.round((data.totalMinutes / totalFailureMinutes) * 1000) /
              10
            : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage);

    // Find most common fault
    const mostCommonFault =
      breakdownByTypeArray.length > 0 ? breakdownByTypeArray[0] : null;

    // Calculate total available hours for failure rate
    const rangeDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    const totalAvailableHours = totalOvensCount * rangeDays * 24;

    // Generate trend data
    const bucketMs = granularity === 'hour' ? 3600000 : 86400000;
    const trendData: Record<string, unknown>[] = [];

    let bucketStart = new Date(from);
    while (bucketStart < to) {
      const bucketEnd = new Date(bucketStart.getTime() + bucketMs);

      let bucketFailureCount = 0;
      let bucketFailureMinutes = 0;

      for (const fault of faults) {
        const faultStart = new Date(fault.startTime);
        const faultEnd = fault.endTime ? new Date(fault.endTime) : new Date();

        // Check overlap with this bucket
        const overlapStart =
          faultStart > bucketStart ? faultStart : bucketStart;
        const overlapEnd = faultEnd < bucketEnd ? faultEnd : bucketEnd;

        if (overlapEnd > overlapStart) {
          bucketFailureCount++;
          bucketFailureMinutes +=
            (overlapEnd.getTime() - overlapStart.getTime()) / 60000;
        }
      }

      trendData.push({
        timestamp: bucketStart.toISOString(),
        failureCount: bucketFailureCount,
        failureMinutes: Math.round(bucketFailureMinutes),
      });

      bucketStart = bucketEnd;
    }

    const response = {
      summary: {
        totalFailures,
        totalFailureHours: Math.round(totalFailureMinutes / 60),
        totalAvailableHours: Math.round(totalAvailableHours),
        failureRate:
          totalAvailableHours > 0
            ? Math.round(
                (totalFailureMinutes / 60 / totalAvailableHours) * 1000,
              ) / 10
            : 0,
        avgFailureDuration:
          totalFailures > 0
            ? Math.round(totalFailureMinutes / totalFailures)
            : 0,
        mostCommonFaultKey: mostCommonFault?.faultKey || '',
        mostCommonFaultName: mostCommonFault?.faultName || '',
      },
      breakdownByType: breakdownByTypeArray,
      breakdownByOven: breakdownByOvenArray,
      trendData,
      detailedRecords: detailedRecords.sort(
        (a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
      ),
      faultTranslations: Object.fromEntries(faultNameMap),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failure statistics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch failure statistics' },
      { status: 500 },
    );
  }
}
