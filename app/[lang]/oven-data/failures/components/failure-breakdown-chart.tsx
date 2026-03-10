"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useFailureStats } from "../hooks/use-failure-stats";
import type { OeeParams } from "../lib/types";

const COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
];

interface FailureBreakdownChartProps {
  params: OeeParams;
  dict: any;
  lang: string;
}

export default function FailureBreakdownChart({
  params,
  dict,
  lang,
}: FailureBreakdownChartProps) {
  const { data, isLoading } = useFailureStats(params);

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{dict.failureStatistics.charts.breakdownByType}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            {dict.loadingData || "Loading..."}
          </div>
        </CardContent>
      </Card>
    );
  }

  const { breakdownByType, faultTranslations } = data;

  if (breakdownByType.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{dict.failureStatistics.charts.breakdownByType}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            {dict.noDataAvailable}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Translate fault names
  const translatedData = breakdownByType.map((item) => ({
    ...item,
    faultName: faultTranslations[item.faultKey]?.[lang] || item.faultKey,
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{dict.failureStatistics.charts.breakdownByType}</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        {/* Pie Chart with responsive legend */}
        <div className="h-[350px] sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={translatedData}
                dataKey="percentage"
                nameKey="faultName"
                cx="50%"
                cy="45%"
                outerRadius={80}
                label={(entry) => `${entry.percentage}%`}
              >
                {translatedData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any, name: any, props: any) => {
                  const count = props.payload.count;
                  let failureText;

                  if (count === 1) {
                    failureText = dict.failureStatistics.charts.failure;
                  } else if (lang === "pl" && count >= 2 && count <= 4) {
                    failureText = dict.failureStatistics.charts.failuresPaucal;
                  } else {
                    failureText = dict.failureStatistics.charts.failures;
                  }

                  return [
                    `${value}% (${count} ${failureText}, ${Math.round(props.payload.totalMinutes / 60)} ${dict.failureStatistics.charts.hoursShort})`,
                    props.payload.faultName,
                  ];
                }}
              />
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                wrapperStyle={{ paddingTop: "10px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
