'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { TrendResponse } from '../lib/types';

interface TrendChartProps {
  data: TrendResponse;
  dict: any;
  lang: string;
}

export default function TrendChart({ data, dict }: TrendChartProps) {
  if (data.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{dict.analysis.trend.chartTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[400px] items-center justify-center text-muted-foreground">
            {dict.analysis.noDataAvailable}
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.data.map((item) => ({
    ...item,
    label: `${item.week}/${item.year}`,
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{dict.analysis.trend.chartTitle}</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                allowDecimals={false}
                label={{
                  value: dict.analysis.trend.deviationsPerWeek,
                  angle: -90,
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' },
                }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <p className="mb-2 font-semibold">
                        {dict.analysis.filters.week} {item.weekNumber},{' '}
                        {item.year}
                      </p>
                      <p className="text-sm">
                        {dict.analysis.pareto.count}:{' '}
                        <span className="font-medium">{item.count}</span>
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#colorCount)"
                name={dict.analysis.trend.deviationsPerWeek}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
