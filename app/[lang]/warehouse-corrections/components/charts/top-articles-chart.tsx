"use client";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

const chartConfig = {
  value: {
    label: "Value (EUR)",
    color: "#8b5cf6",
  },
} satisfies ChartConfig;

interface TopArticlesChartProps {
  data: {
    articleNumber: string;
    articleName: string;
    quantity: number;
    value: number;
    count: number;
  }[];
}

export default function TopArticlesChart({ data }: TopArticlesChartProps) {
  const chartData = data.slice(0, 10).map((item) => ({
    ...item,
    label: item.articleNumber,
  }));

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <BarChart data={chartData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="label" type="category" width={120} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
