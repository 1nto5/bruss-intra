"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock, TrendingUp, Timer } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useFailureStats } from "../hooks/use-failure-stats";
import type { OeeParams } from "../lib/types";
import { formatDuration } from "../lib/format-time";

interface FailureStatsSummaryCardsProps {
  params: OeeParams;
  dict: any;
}

export default function FailureStatsSummaryCards({
  params,
  dict,
}: FailureStatsSummaryCardsProps) {
  const { data, isLoading, error } = useFailureStats(params);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[140px]" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[100px]" />
              <Skeleton className="mt-2 h-3 w-[150px]" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center text-muted-foreground">
        {dict.errorLoadingData}
      </div>
    );
  }

  const { summary } = data;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Failures */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {dict.failureStatistics.summaryCards.totalFailures}
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {summary.totalFailures.toLocaleString()}
          </div>
        </CardContent>
      </Card>

      {/* Total Downtime */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {dict.failureStatistics.summaryCards.totalDowntime}
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {summary.totalFailureHours.toLocaleString()}{" "}
            {dict.failureStatistics.charts.hoursShort}
          </div>
        </CardContent>
      </Card>

      {/* Failure Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {dict.failureStatistics.summaryCards.failureRate}
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.failureRate}%</div>
        </CardContent>
      </Card>

      {/* Avg Duration */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {dict.failureStatistics.summaryCards.avgDuration}
          </CardTitle>
          <Timer className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatDuration(summary.avgFailureDuration, {
              minutesShort: dict.failureStatistics.summaryCards.minutesShort,
              hoursShort: dict.failureStatistics.charts.hoursShort,
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
