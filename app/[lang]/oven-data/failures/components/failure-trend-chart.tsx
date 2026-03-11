"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { useFailureStats } from "../hooks/use-failure-stats";
import type { OeeParams } from "../lib/types";

interface FailureTrendChartProps {
  params: OeeParams;
  dict: any;
  lang: string;
}

export default function FailureTrendChart({
  params,
  dict,
  lang,
}: FailureTrendChartProps) {
  const { data, isLoading } = useFailureStats(params);

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{dict.failureStatistics.charts.trendOverTime}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            {dict.loadingData || "Loading..."}
          </div>
        </CardContent>
      </Card>
    );
  }

  const { trendData } = data;

  if (trendData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{dict.failureStatistics.charts.trendOverTime}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            {dict.noDataAvailable}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Detect granularity based on timestamp intervals
  const isHourlyGranularity =
    trendData.length >= 2
      ? new Date(trendData[1].timestamp).getTime() -
          new Date(trendData[0].timestamp).getTime() <=
        3600000
      : false;

  // Format timestamps for display
  const formattedData = trendData.map((point) => {
    const date = new Date(point.timestamp);

    const displayTime = isHourlyGranularity
      ? date.toLocaleString("pl-PL", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : date.toLocaleString("pl-PL", {
          day: "2-digit",
          month: "2-digit",
        });

    return {
      ...point,
      displayTime,
    };
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{dict.failureStatistics.charts.trendOverTime}</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="displayTime"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const count = payload[0].payload.failureCount;
                  let failureText;

                  if (count === 1) {
                    failureText = dict.failureStatistics.charts.failure;
                  } else if (lang === "pl" && count >= 2 && count <= 4) {
                    failureText = dict.failureStatistics.charts.failuresPaucal;
                  } else {
                    failureText = dict.failureStatistics.charts.failures;
                  }

                  return (
                    <div className="bg-background border rounded-lg p-3 shadow-lg">
                      <p className="text-sm font-semibold mb-2">
                        {payload[0].payload.displayTime}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {count}
                        </span>{" "}
                        {failureText}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {dict.failureStatistics.charts.downtime}:{" "}
                        <span className="font-medium text-foreground">
                          {Math.round(payload[0].payload.failureMinutes / 60)}{" "}
                          {dict.failureStatistics.charts.hoursShort}
                        </span>
                      </p>
                    </div>
                  );
                }}
              />
              <Legend />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="failureMinutes"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.3}
                name={dict.failureStatistics.charts.failureHours}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="failureCount"
                stroke="#f97316"
                strokeWidth={2}
                name={dict.failureStatistics.charts.failureCount}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
