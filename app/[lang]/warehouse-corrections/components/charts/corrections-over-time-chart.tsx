"use client";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

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

interface CorrectionsOverTimeChartProps {
  data: { year: number; month: number; count: number; value: number }[];
}

export default function CorrectionsOverTimeChart({
  data,
}: CorrectionsOverTimeChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    label: `${item.month.toString().padStart(2, "0")}.${item.year}`,
  }));

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <AreaChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey="count"
          stroke="var(--color-count)"
          fill="var(--color-count)"
          fillOpacity={0.2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
