import {
  HISTORICAL_DAYS_LOOKBACK,
  IQR_MULTIPLIER,
  MAX_HISTORICAL_PROCESSES_LIMIT,
  MAX_TEMPERATURE_LOGS_PER_QUERY,
  MIN_VALUES_FOR_IQR,
  TEMPERATURE_PRECISION_DECIMALS,
  TEMPORAL_OUTLIER_THRESHOLD,
} from '@/app/[lang]/oven-data/lib/constants';
import type {
  ChartTemperatureData,
  HistoricalDataPoint,
  HistoricalStatistics,
} from '@/app/[lang]/oven-data/lib/types';
import { dbc } from '@/lib/db/mongo';
import { type Document, type Filter, ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Batch processing configuration for large datasets
 * Processes data in chunks to maintain memory efficiency
 */
const BATCH_PROCESSING_CONFIG = {
  CHUNK_SIZE: 5000, // Process temperature logs in chunks of 5000
  MAX_CONCURRENT_BATCHES: 3, // Maximum concurrent processing batches
  MEMORY_THRESHOLD_MB: 100, // Approximate memory threshold in MB
};

/**
 * Linear interpolation helper for precise percentile calculation
 *
 * When a percentile position falls between two array indices, this function
 * interpolates between the adjacent values to provide a more accurate result
 * than simply using the nearest value.
 *
 * @param sortedArray - Pre-sorted array of values
 * @param position - Exact position (can be fractional) in the array
 * @returns Interpolated value at the specified position
 */
function interpolateValue(sortedArray: number[], position: number): number {
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);

  // If position is exactly on an index, return that value
  if (lowerIndex === upperIndex) {
    return sortedArray[lowerIndex];
  }

  // Handle edge cases at array boundaries
  if (lowerIndex < 0) return sortedArray[0];
  if (upperIndex >= sortedArray.length)
    return sortedArray[sortedArray.length - 1];

  // Linear interpolation between the two adjacent values
  const fraction = position - lowerIndex;
  const lowerValue = sortedArray[lowerIndex];
  const upperValue = sortedArray[upperIndex];

  return lowerValue + fraction * (upperValue - lowerValue);
}

/**
 * Filter outliers using Interquartile Range (IQR) method
 *
 * IQR is a robust statistical method for outlier detection that:
 * 1. Calculates the 25th percentile (Q1) and 75th percentile (Q3) using linear interpolation
 * 2. Computes the Interquartile Range: IQR = Q3 - Q1
 * 3. Defines outlier boundaries as Q1 - (multiplier × IQR) and Q3 + (multiplier × IQR)
 * 4. Filters out values beyond these boundaries
 *
 * This method is preferred over standard deviation because it's less sensitive
 * to extreme values and works well with skewed distributions common in industrial data.
 * The linear interpolation approach provides more accurate quartiles than nearest-rank methods,
 * especially important for smaller datasets or when precise outlier detection is critical.
 *
 * @param values - Array of numerical temperature values to filter
 * @param multiplier - IQR multiplier for outlier detection (1.5 = standard, 1.0 = aggressive)
 * @returns Filtered array with outliers removed, preserving data integrity
 */
function filterOutliersIQR(
  values: number[],
  multiplier: number = IQR_MULTIPLIER,
): number[] {
  if (values.length < MIN_VALUES_FOR_IQR) return values; // Need minimum data points for reliable statistics

  // Sort values to calculate quartiles accurately
  const sorted = [...values].sort((a, b) => a - b);

  // Calculate quartile positions using interpolation for statistical accuracy
  // This method provides more precise quartiles than simple nearest-rank approach
  const q1Position = (sorted.length - 1) * 0.25;
  const q3Position = (sorted.length - 1) * 0.75;

  // Linear interpolation for more accurate quartile calculation
  const Q1 = interpolateValue(sorted, q1Position); // 25th percentile (first quartile)
  const Q3 = interpolateValue(sorted, q3Position); // 75th percentile (third quartile)
  const IQR = Q3 - Q1; // Interquartile range - measure of statistical spread

  // Define outlier boundaries using the "1.5 × IQR rule"
  const lowerBound = Q1 - multiplier * IQR;
  const upperBound = Q3 + multiplier * IQR;

  // Filter out values beyond the outlier boundaries
  return values.filter((v) => v >= lowerBound && v <= upperBound);
}

/**
 * Calculate arithmetic mean (average) of temperature values
 *
 * The mean provides a central tendency measure that represents the typical
 * temperature value. Used alongside median to detect distribution skewness.
 *
 * @param values - Array of numerical temperature values
 * @returns Arithmetic mean of the input values
 */
function calculateMean(values: number[]): number {
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate median of temperature values
 *
 * The median is the middle value when data is sorted, providing a robust
 * central tendency measure that's less affected by extreme outliers than the mean.
 * For industrial temperature data, median often represents the "true" process
 * temperature better than mean when sensor malfunctions occur.
 *
 * @param values - Array of numerical temperature values
 * @returns Median value (middle value for odd count, average of two middle values for even count)
 */
function calculateMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2 // Even count: average of two middle values
    : sorted[mid]; // Odd count: middle value
}

/**
 * Calculate historical statistics (both median and average) for temporal outlier detection
 *
 * STATISTICAL METHODOLOGY:
 * This function implements a dual-baseline approach for detecting unusual temperature patterns:
 *
 * 1. **Historical Baseline Calculation**:
 *    - Analyzes the last 30 days of processes with the same article number
 *    - Groups temperature data by relative time from process start (minute precision)
 *    - For each time point, calculates both median and average from historical data
 *    - Applies IQR filtering to remove historical outliers that could skew baseline
 *
 * 2. **Temporal Outlier Detection Logic**:
 *    - Current process temperatures are compared against historical baselines
 *    - A measurement is flagged as temporal outlier if BOTH conditions are met:
 *      * Current average deviates >30% from historical average
 *      * Current median deviates >30% from historical median
 *    - Dual criteria prevents false positives from sensor variations or process changes
 *
 * 3. **Memory and Performance Optimizations**:
 *    - Uses streaming cursor processing to handle large datasets
 *    - Implements database projections to reduce network overhead
 *    - Process lookup map provides O(1) access to start times
 *    - Batch processing prevents event loop blocking
 *
 * @param article - The article number to analyze (same product type)
 * @param currentProcessStartTime - Start time of the current process (excluded from baseline)
 * @param oven - The oven identifier for filtering (optional optimization)
 * @returns Object with maps for medians and averages by relative time in minutes
 */
async function calculateHistoricalStatistics(
  article: string,
  currentProcessStartTime: Date,
  oven?: string,
): Promise<HistoricalStatistics> {
  try {
    const processCollection = await dbc('oven_processes');
    const tempCollection = await dbc('oven_temperature_logs');

    // Find all processes with the same article in the last N days (excluding current process)
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - HISTORICAL_DAYS_LOOKBACK);

    const historicalProcessFilter: Filter<Document> = {
      article,
      startTime: {
        $gte: lookbackDate,
        $lt: currentProcessStartTime, // Exclude current process
      },
      status: { $in: ['finished', 'running'] }, // Only completed or active processes
    };

    // Optionally filter by oven for better performance and relevance
    if (oven) {
      historicalProcessFilter.oven = oven;
    }

    // OPTIMIZED QUERY: Get all historical processes with projection to reduce memory
    const historicalProcesses = await processCollection
      .find(historicalProcessFilter, {
        projection: {
          _id: 1,
          startTime: 1,
          article: 1,
          oven: 1,
          status: 1,
        },
      })
      // Note: .hint() removed as it was causing silent query failures
      .toArray();

    if (historicalProcesses.length === 0) {
      return { medians: new Map(), averages: new Map() };
    }

    // OPTIMIZED AGGREGATION: Use MongoDB aggregation pipeline to reduce memory usage
    // Group by relative time in minutes directly in the database
    const historicalProcessIds = historicalProcesses.map(
      (p) => new ObjectId(p._id.toString()),
    );

    // Create process lookup map for efficient access
    const processLookup = new Map(
      historicalProcesses.map((p) => [p._id.toString(), p]),
    );

    // Stream processing with cursor to minimize memory footprint
    const cursor = tempCollection
      .find(
        {
          processIds: { $in: historicalProcessIds },
          avgTemp: { $exists: true, $ne: null },
          medianTemp: { $exists: true, $ne: null },
        },
        {
          projection: {
            processIds: 1,
            timestamp: 1,
            avgTemp: 1,
            medianTemp: 1,
          },
        },
      )
      // Note: .hint() removed as it was causing silent query failures
      .sort({ timestamp: 1 });

    // IN-MEMORY PROCESSING: Group statistics by relative time in minutes
    // Only use properly filtered data from cron job (no fallback)
    const statsByMinute = new Map<
      number,
      { averages: number[]; medians: number[] }
    >();

    // Process data in batches to reduce memory usage and improve performance
    let processedCount = 0;
    const batchSize = BATCH_PROCESSING_CONFIG.CHUNK_SIZE;

    // Use async iteration for better memory management
    for await (const log of cursor) {
      // IMPORTANT: Temperature logs can contain multiple processIds (batch processing)
      // We need to iterate through ALL processIds and calculate relative times for each
      for (const processIdObj of log.processIds) {
        const processId = processIdObj.toString();
        const process = processLookup.get(processId);

        if (!process) continue;

        // Calculate relative time in minutes from process start
        // This enables comparison of processes at equivalent stages
        const relativeTimeMs =
          log.timestamp.getTime() - process.startTime.getTime();
        const relativeTimeMinutes = Math.floor(relativeTimeMs / (60 * 1000)); // Round to nearest minute for grouping

        if (relativeTimeMinutes < 0) continue; // Skip invalid data (timestamps before process start)

        // Only use pre-filtered data from cron job - no fallback to raw sensors
        // This ensures consistent baseline calculation using already-processed temperature values
        const avgTemperature = log.avgTemp; // Filtered average (sensor outliers already removed)
        const medianTemperature = log.medianTemp; // Median temperature (robust central tendency)

        // Skip records that don't have properly filtered data
        if (avgTemperature && medianTemperature) {
          // Group by relative time to build statistical baseline for each process stage
          if (!statsByMinute.has(relativeTimeMinutes)) {
            statsByMinute.set(relativeTimeMinutes, {
              averages: [],
              medians: [],
            });
          }
          statsByMinute.get(relativeTimeMinutes)!.averages.push(avgTemperature);
          statsByMinute
            .get(relativeTimeMinutes)!
            .medians.push(medianTemperature);
        }
      }

      processedCount++;

      // Yield control periodically to prevent blocking event loop
      if (processedCount % batchSize === 0) {
        // Allow garbage collection between batches
        await new Promise((resolve) => setImmediate(resolve));
      }
    }

    // Calculate clean statistics with IQR filtering to remove temporal outliers
    const mediansByMinute = new Map<number, number>();
    const averagesByMinute = new Map<number, number>();

    for (const [minute, stats] of statsByMinute) {
      if (stats.averages.length > 0 && stats.medians.length > 0) {
        // Apply IQR filtering to remove extreme values (temporal outliers)
        const filteredAverages = filterOutliersIQR(stats.averages);
        const filteredMedians = filterOutliersIQR(stats.medians);

        if (filteredAverages.length > 0) {
          const cleanAverage = calculateMean(filteredAverages);
          const precisionMultiplier = Math.pow(
            10,
            TEMPERATURE_PRECISION_DECIMALS,
          );
          averagesByMinute.set(
            minute,
            Math.round(cleanAverage * precisionMultiplier) /
              precisionMultiplier,
          );
        }

        if (filteredMedians.length > 0) {
          const cleanMedian = calculateMedian(filteredMedians);
          const precisionMultiplier = Math.pow(
            10,
            TEMPERATURE_PRECISION_DECIMALS,
          );
          mediansByMinute.set(
            minute,
            Math.round(cleanMedian * precisionMultiplier) / precisionMultiplier,
          );
        }
      }
    }

    return { medians: mediansByMinute, averages: averagesByMinute };
  } catch (error) {
    console.error('Error calculating historical statistics:', error);
    return { medians: new Map(), averages: new Map() };
  }
}

/**
 * Get historical statistics for a specific relative time from pre-calculated data
 * @param historicalStats - Pre-calculated statistics object
 * @param relativeTimeMinutes - Target relative time in minutes
 * @returns Object with median and average temperatures or nulls if no data
 */
function getHistoricalStatsAtTime(
  historicalStats: HistoricalStatistics,
  relativeTimeMinutes: number,
): HistoricalDataPoint {
  const targetMinute = Math.floor(relativeTimeMinutes);
  return {
    median: historicalStats.medians.get(targetMinute) || null,
    average: historicalStats.averages.get(targetMinute) || null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Get process IDs or filter parameters
    const processId = searchParams.get('process_id');
    const oven = searchParams.get('oven');
    const hydraBatch = searchParams.get('hydra_batch');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let processIds: ObjectId[] = [];

    if (processId) {
      // Single process temperature data
      processIds = [new ObjectId(processId)];
    } else {
      // Find processes based on filters
      const processCollection = await dbc('oven_processes');
      const processFilter: Filter<Document> = {};

      if (oven) processFilter.oven = oven;
      if (hydraBatch) processFilter.hydraBatch = hydraBatch;
      if (from || to) {
        processFilter.startTime = {};
        if (from) processFilter.startTime.$gte = new Date(from);
        if (to) processFilter.startTime.$lte = new Date(to);
      }

      const processes = await processCollection
        .find(processFilter)
        .sort({ startTime: -1 })
        .limit(MAX_HISTORICAL_PROCESSES_LIMIT) // Limit number of processes for temperature data (keep lower for performance)
        .toArray();

      processIds = processes.map((p) => new ObjectId(p._id));
    }

    if (processIds.length === 0) {
      return NextResponse.json([]);
    }

    // Get current process information for historical median calculation
    let currentProcess = null;
    if (processId) {
      const processCollection = await dbc('oven_processes');
      currentProcess = await processCollection.findOne({
        _id: new ObjectId(processId),
      });
    }

    // Get temperature logs
    const tempCollection = await dbc('oven_temperature_logs');
    const tempFilter: Filter<Document> = {
      processIds: { $in: processIds },
    };

    // Additional time filtering for temperature logs
    if (from || to) {
      tempFilter.timestamp = {};
      if (from) tempFilter.timestamp.$gte = new Date(from);
      if (to) tempFilter.timestamp.$lte = new Date(to);
    }

    // Optimized temperature logs query with projection
    const temperatureLogs = await tempCollection
      .find(tempFilter, {
        projection: {
          _id: 1,
          processIds: 1,
          timestamp: 1,
          sensorData: 1,
          avgTemp: 1,
          medianTemp: 1,
          outlierSensors: 1,
          hasOutliers: 1,
        },
      })
      .sort({ timestamp: 1 })
      .limit(MAX_TEMPERATURE_LOGS_PER_QUERY) // Support for long processes: 12h@1min = 720 readings, with safety margin
      .toArray();

    // BATCH PROCESSING: Calculate all historical statistics once before processing temperature logs
    let historicalStats: HistoricalStatistics = {
      medians: new Map<number, number>(),
      averages: new Map<number, number>(),
    };
    if (currentProcess && currentProcess.article) {
      historicalStats = await calculateHistoricalStatistics(
        currentProcess.article,
        currentProcess.startTime,
        currentProcess.oven,
      );
    }

    // Process temperature data for charts with temporal outlier detection
    const chartData: ChartTemperatureData[] = temperatureLogs.map(
      (log): ChartTemperatureData => {
        // Only use properly filtered data from cron job (no fallback)
        const avgTemp = log.avgTemp;
        const medianTemp = log.medianTemp;

        // Get historical statistics for this specific time point
        let historicalMedian: number | null = null;
        let historicalAverage: number | null = null;
        let isTemporalOutlier = false;

        if (currentProcess && currentProcess.article && avgTemp && medianTemp) {
          // Calculate relative time in minutes from process start
          const relativeTimeMs =
            log.timestamp.getTime() - currentProcess.startTime.getTime();
          const relativeTimeMinutes = relativeTimeMs / (60 * 1000);

          if (relativeTimeMinutes >= 0) {
            const historicalData = getHistoricalStatsAtTime(
              historicalStats,
              relativeTimeMinutes,
            );

            historicalMedian = historicalData.median;
            historicalAverage = historicalData.average;

            // TEMPORAL OUTLIER DETECTION ALGORITHM:
            // Detect temperature patterns that deviate significantly from historical baselines
            if (historicalAverage && historicalMedian) {
              // Calculate relative percentage deviations from historical baselines
              const avgDeviation =
                Math.abs(avgTemp - historicalAverage) / historicalAverage;
              const medDeviation =
                Math.abs(medianTemp - historicalMedian) / historicalMedian;

              // DUAL-CRITERIA OUTLIER DETECTION:
              // Mark as temporal outlier ONLY if BOTH conditions are met:
              // 1. Current filtered average deviates >30% from historical average
              // 2. Current median deviates >30% from historical median
              //
              // This dual approach prevents false positives from:
              // - Single sensor malfunctions (caught by sensor outlier detection)
              // - Temporary process variations (median remains stable)
              // - Measurement noise (both statistics must be consistently off)
              isTemporalOutlier =
                avgDeviation > TEMPORAL_OUTLIER_THRESHOLD &&
                medDeviation > TEMPORAL_OUTLIER_THRESHOLD;
            }
          }
        }

        return {
          _id: log._id.toString(),
          processIds: log.processIds.map((id: ObjectId) => id.toString()),
          timestamp: log.timestamp,
          sensorData: log.sensorData || {},
          avgTemp, // Filtered average from cron job (excluding sensor outliers)
          medianTemp, // Median from cron job
          // Include sensor-level outlier detection data
          outlierSensors: log.outlierSensors || [],
          hasOutliers: log.hasOutliers || false,
          // Add historical statistics for comparison
          historicalMedian,
          historicalAverage, // NEW: Historical 30-day average
          isTemporalOutlier, // NEW: Flag for temporal deviation
        };
      },
    );

    return NextResponse.json(chartData);
  } catch (error) {
    console.error('Oven temperature API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch oven temperature data' },
      { status: 500 },
    );
  }
}
