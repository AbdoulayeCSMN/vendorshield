'use client';

import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';

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

import type { AccountRiskDashboard } from '~/lib/vendorshield/types';

interface Props {
  kpis: AccountRiskDashboard | null;
}

const chartConfig = {
  score: {
    label: 'Score moyen',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

export function DimensionRadarChart({ kpis }: Props) {
  const data = [
    { dimension: 'Financier',    score: kpis?.avg_financial_score    ?? 0 },
    { dimension: 'Opérationnel', score: kpis?.avg_operational_score  ?? 0 },
    { dimension: 'Géopolitique', score: kpis?.avg_geopolitical_score ?? 0 },
    { dimension: 'ESG',          score: kpis?.avg_esg_score          ?? 0 },
  ];

  const isEmpty = data.every((d) => d.score === 0);

  // Couleur du fill selon score global
  const avgScore = kpis?.avg_global_score ?? null;
  const fillColor =
    avgScore === null ? '#6366f1'
    : avgScore >= 70 ? '#22c55e'
    : avgScore >= 40 ? '#f97316'
    : '#ef4444';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Scores moyens par dimension</CardTitle>
        <CardDescription>Vision 360° de l'exposition au risque</CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-[260px] items-center justify-center text-sm text-gray-400">
            Aucune évaluation disponible.
          </div>
        ) : (
          <>
            <ChartContainer config={chartConfig} className="h-[240px] w-full">
              <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid gridType="polygon" stroke="var(--color-border-tertiary)" />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
                />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  formatter={(value) => [`${value}/100`, 'Score moyen']}
                />
                <Radar
                  name="Score moyen"
                  dataKey="score"
                  stroke={fillColor}
                  fill={fillColor}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RadarChart>
            </ChartContainer>

            {/* Mini scores sous le radar */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              {data.map((d) => {
                const color =
                  d.score >= 70 ? 'text-green-600'
                  : d.score >= 40 ? 'text-orange-600'
                  : 'text-red-600';
                const bg =
                  d.score >= 70 ? 'bg-green-50 dark:bg-green-950/30'
                  : d.score >= 40 ? 'bg-orange-50 dark:bg-orange-950/30'
                  : 'bg-red-50 dark:bg-red-950/30';
                return (
                  <div key={d.dimension} className={`flex items-center justify-between rounded-lg px-3 py-2 ${bg}`}>
                    <span className="text-xs text-gray-600 dark:text-gray-400">{d.dimension}</span>
                    <span className={`text-sm font-bold tabular-nums ${color}`}>{d.score}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
