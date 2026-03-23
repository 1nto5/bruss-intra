"use client";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

const chartConfig = {
  totalValue: {
    label: "Value (EUR)",
    color: "#f59e0b",
  },
} satisfies ChartConfig;

interface CorrectionsByQuarryChartProps {
  data: { quarry: string; totalQuantity: number; totalValue: number }[];
}

export default function CorrectionsByQuarryChart({
  data,
}: CorrectionsByQuarryChartProps) {
  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="quarry" type="category" width={100} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="totalValue" fill="var(--color-totalValue)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
