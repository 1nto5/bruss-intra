"use client";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { Dictionary } from "../../lib/dict";

const chartConfig = {
  count: {
    label: "Count",
    color: "#3b82f6",
  },
  value: {
    label: "Value (EUR)",
    color: "#10b981",
  },
} satisfies ChartConfig;

interface CorrectionsByTypeChartProps {
  data: { type: string; count: number; value: number }[];
  dict: Dictionary;
}

export default function CorrectionsByTypeChart({
  data,
  dict,
}: CorrectionsByTypeChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    name: dict.types[item.type as keyof typeof dict.types] || item.type,
  }));

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={4} />
        <Bar dataKey="value" fill="var(--color-value)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
