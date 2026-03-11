"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Locale } from "@/lib/config/i18n";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { OvenProcessDataType } from "../lib/types";
import { useTemperatureData } from "../hooks/use-temperature-data";
import TemperatureChartSkeleton from "./temperature-chart-skeleton";
import type { Dictionary } from "../lib/dict";
import { formatTime, formatDateTime } from "@/lib/utils/date-format";

interface OvenTemperatureChartProps {
  selectedProcess: OvenProcessDataType | null;
  lang: Locale;
  dict: Dictionary;
}

const chartConfig = {
  z0: {
    label: "TL", // Top Left
    color: "#3b82f6", // Blue
  },
  z1: {
    label: "TR", // Top Right
    color: "#ef4444", // Red
  },
  z2: {
    label: "BL", // Bottom Left
    color: "#10b981", // Green
  },
  z3: {
    label: "BR", // Bottom Right
    color: "#f59e0b", // Orange
  },
  avgTemp: {
    label: "Avg",
    color: "#8b5cf6", // Purple
  },
  medianTemp: {
    label: "Median",
    color: "#06b6d4", // Cyan
  },
  historicalMedian: {
    label: "30d Median",
    color: "#ec4899", // Pink
  },
  historicalAverage: {
    label: "30d Avg",
    color: "#10b981", // Green
  },
  targetTemp: {
    label: "Tgt",
    color: "#6b7280", // Gray (dashed line)
  },
} satisfies ChartConfig;

export default function OvenTemperatureChart({
  selectedProcess,
  lang,
  dict,
}: OvenTemperatureChartProps) {
  // React Query with manual loading state management
  const { data: temperatureData, isLoading } =
    useTemperatureData(selectedProcess);

  // Show loading skeleton when data is being fetched
  if (isLoading && selectedProcess) {
    return <TemperatureChartSkeleton dict={dict} />;
  }

  // Show placeholder when no process is selected
  if (!selectedProcess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{dict.temperatureChart.title}</CardTitle>
          <CardDescription>
            {dict.temperatureChart.selectProcess}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[500px] items-center justify-center text-gray-500">
            {dict.temperatureChart.noProcessSelected}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Determine if all data is from a single day
  const allDates = (temperatureData || []).map(
    (log: any) => new Date(log.timestamp),
  );
  const isSingleDay =
    allDates.length > 0 &&
    allDates.every(
      (date: Date) =>
        date.getFullYear() === allDates[0].getFullYear() &&
        date.getMonth() === allDates[0].getMonth() &&
        date.getDate() === allDates[0].getDate(),
    );

  // Count temporal outliers for alert banner
  const deviationCount = (temperatureData || []).filter(
    (log: any) => log.isTemporalOutlier,
  ).length;

  // Process data for chart
  const chartData = (temperatureData || []).map((log: any) => {
    const outlierSensors = log.outlierSensors || [];

    return {
      timestamp: isSingleDay
        ? formatTime(log.timestamp, { hour: "2-digit", minute: "2-digit" })
        : formatDateTime(log.timestamp),
      // Only include sensor data if it's not an outlier
      z0: outlierSensors.includes("z0") ? null : log.sensorData?.z0 || null,
      z1: outlierSensors.includes("z1") ? null : log.sensorData?.z1 || null,
      z2: outlierSensors.includes("z2") ? null : log.sensorData?.z2 || null,
      z3: outlierSensors.includes("z3") ? null : log.sensorData?.z3 || null,
      avgTemp: log.avgTemp, // Filtered average (excluding sensor outliers)
      medianTemp: log.medianTemp || null, // Median temperature
      historicalMedian: log.historicalMedian || null, // 30-day historical median
      historicalAverage: log.historicalAverage || null, // 30-day historical average
      targetTemp: selectedProcess?.targetTemp, // Target temperature
      isTemporalOutlier: log.isTemporalOutlier || false, // Temporal outlier flag
    };
  });

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{dict.temperatureChart.title}</CardTitle>
          <CardDescription>
            {dict.temperatureChart.noDataAvailable}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center text-gray-500">
            {dict.temperatureChart.noDataFound}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check if historical data exists in the dataset
  const hasHistoricalMedian = chartData.some(
    (d: any) =>
      d.historicalMedian !== null && typeof d.historicalMedian === "number",
  );
  const hasHistoricalAverage = chartData.some(
    (d: any) =>
      d.historicalAverage !== null && typeof d.historicalAverage === "number",
  );

  // Calculate min/max for Y-axis from actual sensor/average/median data (not target)
  const yValues = chartData.flatMap((d: any) =>
    [
      d.z0,
      d.z1,
      d.z2,
      d.z3,
      d.avgTemp,
      d.medianTemp,
      d.historicalMedian,
      d.historicalAverage,
    ].filter((v) => typeof v === "number"),
  );
  const minY = yValues.length ? Math.min(...yValues) : 0;
  const maxY = yValues.length ? Math.max(...yValues) : 100;
  const yDomain = [Math.floor(minY), Math.ceil(maxY)];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{dict.temperatureChart.title}</CardTitle>
          <CardDescription>
            {selectedProcess && (
              <>
                {selectedProcess.hydraBatch} ({selectedProcess.article}){" "}
                {dict.temperatureChart.on} {selectedProcess.oven.toUpperCase()}{" "}
                ({dict.temperatureChart.target}: {selectedProcess.targetTemp}°C
                ±{selectedProcess.tempTolerance}°C)
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Deviation Alert Banner */}
          {deviationCount > 0 && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {deviationCount}{" "}
                {deviationCount !== 1
                  ? dict.temperatureChart.deviationAlertPlural
                  : dict.temperatureChart.deviationAlert}
              </AlertDescription>
            </Alert>
          )}
          <ChartContainer config={chartConfig} className="h-[500px] w-full">
            <LineChart
              data={chartData}
              margin={{ left: 0, right: 20, top: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="timestamp" interval="preserveStart" />
              <YAxis
                domain={yDomain}
                label={{
                  value: dict.temperatureChart.temperatureLabel,
                  angle: -90,
                  position: "insideLeft",
                  style: { textAnchor: "middle" },
                }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value: any) => `Time: ${value}`}
                    formatter={(value: any, name: any, props: any) => {
                      const labels: { [key: string]: string } = {
                        z0: "TL",
                        z1: "TR",
                        z2: "BL",
                        z3: "BR",
                        avgTemp: "Avg",
                        medianTemp: "Median",
                        historicalMedian: "30d Median",
                        historicalAverage: "30d Avg",
                        targetTemp: "Tgt",
                      };

                      // No special handling for temporal outliers in tooltip - dots only on chart

                      return [`${labels[name] || name}: ${value}°C`, ""];
                    }}
                  />
                }
              />
              <ChartLegend
                content={({ payload }) => (
                  <div className="flex flex-wrap justify-center gap-4 text-sm">
                    {payload
                      ?.map((entry, index) => {
                        const isHistorical =
                          entry.dataKey === "historicalMedian" ||
                          entry.dataKey === "historicalAverage";
                        const isTarget = entry.dataKey === "targetTemp";

                        // Hide historical entries when no data exists
                        if (
                          entry.dataKey === "historicalMedian" &&
                          !hasHistoricalMedian
                        ) {
                          return null;
                        }
                        if (
                          entry.dataKey === "historicalAverage" &&
                          !hasHistoricalAverage
                        ) {
                          return null;
                        }

                        return (
                          <div
                            key={`legend-${index}`}
                            className="flex items-center gap-2"
                          >
                            <div className="flex items-center">
                              {isHistorical ? (
                                // Dashed line for historical data
                                <svg width="18" height="2">
                                  <line
                                    x1="0"
                                    y1="1"
                                    x2="18"
                                    y2="1"
                                    stroke={entry.color}
                                    strokeWidth="2"
                                    strokeDasharray={
                                      entry.dataKey === "historicalAverage"
                                        ? "2 2"
                                        : "3 3"
                                    }
                                  />
                                </svg>
                              ) : isTarget ? (
                                // Longer dashed line for target
                                <svg width="18" height="2">
                                  <line
                                    x1="0"
                                    y1="1"
                                    x2="18"
                                    y2="1"
                                    stroke={entry.color}
                                    strokeWidth="2"
                                    strokeDasharray="5 5"
                                  />
                                </svg>
                              ) : (
                                // Solid line for current data
                                <svg width="18" height="2">
                                  <line
                                    x1="0"
                                    y1="1"
                                    x2="18"
                                    y2="1"
                                    stroke={entry.color}
                                    strokeWidth="2"
                                  />
                                </svg>
                              )}
                            </div>
                            <span style={{ color: entry.color }}>
                              {chartConfig[
                                entry.dataKey as keyof typeof chartConfig
                              ]?.label || entry.value}
                            </span>
                          </div>
                        );
                      })
                      .filter(Boolean) /* Remove null entries */}
                  </div>
                )}
              />

              {/* Individual sensor readings */}
              <Line
                type="monotone"
                dataKey="z0"
                stroke={chartConfig.z0.color}
                strokeWidth={1}
                dot={false}
                activeDot={{ r: 2 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="z1"
                stroke={chartConfig.z1.color}
                strokeWidth={1}
                dot={false}
                activeDot={{ r: 2 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="z2"
                stroke={chartConfig.z2.color}
                strokeWidth={1}
                dot={false}
                activeDot={{ r: 2 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="z3"
                stroke={chartConfig.z3.color}
                strokeWidth={1}
                dot={false}
                activeDot={{ r: 2 }}
                connectNulls={false}
              />

              {/* Average temperature with temporal outlier indicators */}
              <Line
                type="monotone"
                dataKey="avgTemp"
                stroke={chartConfig.avgTemp.color}
                strokeWidth={1}
                dot={(props: any) => {
                  // Show orange dot for temporal outliers - ensure immediate rendering
                  if (
                    props.payload &&
                    props.payload.isTemporalOutlier === true
                  ) {
                    return (
                      <circle
                        key={`outlier-${props.payload.timestamp}-${props.index}`}
                        cx={props.cx}
                        cy={props.cy}
                        r={4}
                        fill="#f97316" // Orange warning color
                        stroke="#fff"
                        strokeWidth={2}
                        style={{ pointerEvents: "none" }} // Prevent interaction delays
                      />
                    );
                  }
                  // Return an invisible dot for normal points to satisfy TypeScript
                  return (
                    <circle
                      key={`normal-${props.payload.timestamp}-${props.index}`}
                      cx={props.cx}
                      cy={props.cy}
                      r={0}
                      fill="transparent"
                    />
                  );
                }}
                activeDot={{ r: 2 }}
              />

              {/* Median temperature */}
              <Line
                type="monotone"
                dataKey="medianTemp"
                stroke={chartConfig.medianTemp.color}
                strokeWidth={1}
                dot={false}
                activeDot={{ r: 2 }}
                connectNulls={false}
              />

              {/* Historical median temperature - dashed line for distinction */}
              <Line
                type="monotone"
                dataKey="historicalMedian"
                stroke={chartConfig.historicalMedian.color}
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
                activeDot={{ r: 2 }}
                connectNulls={false}
              />

              {/* Historical average temperature - dotted line */}
              <Line
                type="monotone"
                dataKey="historicalAverage"
                stroke={chartConfig.historicalAverage.color}
                strokeWidth={1}
                strokeDasharray="2 2"
                dot={false}
                activeDot={{ r: 2 }}
                connectNulls={false}
              />

              {/* Target temperature - dashed reference line, thin */}
              <Line
                type="monotone"
                dataKey="targetTemp"
                stroke={chartConfig.targetTemp.color}
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </>
  );
}
