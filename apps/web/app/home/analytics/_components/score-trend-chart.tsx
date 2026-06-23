'use client';

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@kit/ui/chart';

import type { ScoreTrendPoint } from '~/lib/vendorshield/analytics.server';

interface Props {
  trend: ScoreTrendPoint[];
}

const chartConfig = {
  avg_score: {
    label: 'Score moyen',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

// Formater "2025-01" → "Jan 25"
function formatMonth(month: string): string {
  const [year, m] = month.split('-');
  const d = new Date(parseInt(year ?? '0'), parseInt(m ?? '1') - 1);
  return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
}

export function ScoreTrendChart({ trend }: Props) {
  const isEmpty = trend.length === 0;

  // Calculer tendance globale
  const firstScore = trend[0]?.avg_score ?? null;
  const lastScore  = trend[trend.length - 1]?.avg_score ?? null;
  const delta = firstScore !== null && lastScore !== null ? lastScore - firstScore : null;

  const chartData = trend.map((p) => ({
    ...p,
    month: formatMonth(p.month),
    rawMonth: p.month,
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Évolution du score de fiabilité moyen</CardTitle>
            <CardDescription>Score global agrégé par mois sur les 12 derniers mois</CardDescription>
          </div>
          {delta !== null && (
            <div className={`text-right ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <p className="text-lg font-bold tabular-nums">
                {delta >= 0 ? '+' : ''}{delta}
              </p>
              <p className="text-xs text-gray-400">évolution</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">
            Aucune évaluation complétée sur la période — le graphique apparaîtra après les premières évaluations.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <AreaChart data={chartData} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke="var(--color-border-tertiary)"
              />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                tickMargin={8}
              />
              <YAxis
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                tickMargin={4}
                width={28}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => [
                      `${value}/100`,
                      'Score moyen',
                    ]}
                    labelFormatter={(label, payload) => {
                      const item = payload?.[0]?.payload;
                      return `${label} · ${item?.assessment_count ?? 0} évaluation${(item?.assessment_count ?? 0) > 1 ? 's' : ''}`;
                    }}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="avg_score"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2.5}
                fill="url(#scoreGradient)"
                dot={{ r: 3, fill: 'hsl(var(--chart-1))', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
