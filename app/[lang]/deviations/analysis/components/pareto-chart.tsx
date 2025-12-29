'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import type { ParetoResponse } from '../lib/types';

const COLORS = {
  bar: '#3b82f6',
  line: '#ef4444',
  reference: '#22c55e',
};

interface ParetoChartProps {
  data: ParetoResponse;
  dict: any;
  lang: string;
}

export default function ParetoChart({ data, dict, lang }: ParetoChartProps) {
  if (data.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{dict.analysis.pareto.chartTitle}</CardTitle>
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
    reasonLabel:
      data.reasonTranslations[item.reason]?.[
        lang as keyof (typeof data.reasonTranslations)[string]
      ] ||
      data.reasonTranslations[item.reason]?.en ||
      item.reason,
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{dict.analysis.pareto.chartTitle}</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="reasonLabel"
                tick={{ fontSize: 11 }}
                angle={-35}
                textAnchor="end"
                height={100}
                interval={0}
              />
              <YAxis
                yAxisId="left"
                label={{
                  value: dict.analysis.pareto.count,
                  angle: -90,
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' },
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                label={{
                  value: '%',
                  angle: 90,
                  position: 'insideRight',
                  style: { textAnchor: 'middle' },
                }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <p className="mb-2 font-semibold">{item.reasonLabel}</p>
                      <p className="text-sm">
                        {dict.analysis.pareto.count}:{' '}
                        <span className="font-medium">{item.count}</span>
                      </p>
                      <p className="text-sm">
                        {dict.analysis.pareto.percentage}:{' '}
                        <span className="font-medium">{item.percentage}%</span>
                      </p>
                      <p className="text-sm">
                        {dict.analysis.pareto.cumulative}:{' '}
                        <span className="font-medium">{item.cumulative}%</span>
                      </p>
                    </div>
                  );
                }}
              />
              <Legend />
              <ReferenceLine
                yAxisId="right"
                y={80}
                stroke={COLORS.reference}
                strokeDasharray="5 5"
                label={{
                  value: '80%',
                  position: 'right',
                  fill: COLORS.reference,
                  fontSize: 12,
                }}
              />
              <Bar
                yAxisId="left"
                dataKey="count"
                fill={COLORS.bar}
                name={dict.analysis.pareto.deviationCount}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulative"
                stroke={COLORS.line}
                strokeWidth={2}
                dot={{ fill: COLORS.line, r: 4 }}
                name={dict.analysis.pareto.cumulativePercentage}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
