"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Clock, CalendarClock, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useOeeData } from "../hooks/use-oee-data";
import { OeeParams } from "../lib/types";
import type { Dictionary } from "../lib/dict";

interface OeeSummaryCardsProps {
  params: OeeParams;
  dict: Dictionary;
}

export default function OeeSummaryCards({
  params,
  dict,
}: OeeSummaryCardsProps) {
  const { data, isLoading, error } = useOeeData(params);

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

  // Check if there's no data for the selected period
  // Consider "no data" when either: no data points exist OR all running minutes are zero
  const hasNoData =
    !data.dataPoints ||
    data.dataPoints.length === 0 ||
    data.summary.totalRunningHours === 0;

  if (hasNoData) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="md:col-span-2 lg:col-span-4">
          <CardContent className="flex h-24 items-center justify-center">
            <p className="text-muted-foreground">{dict.noDataAvailable}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { summary } = data;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Overall Utilization */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {dict.oeeMetrics.overallUtilization}
          </CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {summary.overallUtilization}%
          </div>
        </CardContent>
      </Card>

      {/* Total Running Time */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {dict.oeeMetrics.totalRunningTime}
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {summary.totalRunningHours.toLocaleString()}h
          </div>
        </CardContent>
      </Card>

      {/* Available Capacity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {dict.oeeMetrics.availableCapacity}
          </CardTitle>
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {summary.totalAvailableHours.toLocaleString()}h
          </div>
        </CardContent>
      </Card>

      {/* Failures */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {dict.oeeMetrics.failures}
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold">
              {summary.totalFailureHours.toLocaleString()}h
            </div>
            {summary.totalFaults > 0 && (
              <Badge variant="destructive" className="text-xs">
                {summary.totalFaults}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
