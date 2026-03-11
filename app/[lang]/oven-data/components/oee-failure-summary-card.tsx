"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Dictionary } from "../lib/dict";

interface OeeFailureSummaryCardProps {
  totalFailureHours: number;
  totalFaults: number;
  totalAvailableHours: number;
  dict: Dictionary;
}

export default function OeeFailureSummaryCard({
  totalFailureHours,
  totalFaults,
  totalAvailableHours,
  dict,
}: OeeFailureSummaryCardProps) {
  // Calculate failure rate as percentage of available capacity
  const failureRate =
    totalAvailableHours > 0
      ? ((totalFailureHours / totalAvailableHours) * 100).toFixed(1)
      : "0.0";

  return (
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
            {totalFailureHours.toLocaleString()}h
          </div>
          <Badge variant="destructive" className="text-xs">
            {totalFaults}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {failureRate}% {dict.oeeMetrics.ofCapacity}
        </p>
      </CardContent>
    </Card>
  );
}
