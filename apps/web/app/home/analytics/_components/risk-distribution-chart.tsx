'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
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
  count: { label: 'Fournisseurs' },
} satisfies ChartConfig;

export function RiskDistributionChart({ kpis }: Props) {
  const total = kpis?.total_suppliers ?? 0;

  const data = [
    {
      level: 'Critique',
      count: kpis?.critical_risk_count ?? 0,
      color: '#ef4444',
      pct: total > 0 ? Math.round(((kpis?.critical_risk_count ?? 0) / total) * 100) : 0,
    },
    {
      level: 'Élevé',
      count: kpis?.high_risk_count ?? 0,
      color: '#f97316',
      pct: total > 0 ? Math.round(((kpis?.high_risk_count ?? 0) / total) * 100) : 0,
    },
    {
      level: 'Modéré',
      count: kpis?.medium_risk_count ?? 0,
      color: '#eab308',
      pct: total > 0 ? Math.round(((kpis?.medium_risk_count ?? 0) / total) * 100) : 0,
    },
    {
      level: 'Faible',
      count: kpis?.low_risk_count ?? 0,
      color: '#22c55e',
      pct: total > 0 ? Math.round(((kpis?.low_risk_count ?? 0) / total) * 100) : 0,
    },
  ];

  const isEmpty = data.every((d) => d.count === 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Distribution des niveaux de risque</CardTitle>
        <CardDescription>Répartition du portefeuille par niveau</CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <EmptyChart />
        ) : (
          <>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ left: 8, right: 32, top: 0, bottom: 0 }}
              >
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--color-border-tertiary)" />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="level"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                  width={55}
                />
                <ChartTooltip
                  cursor={{ fill: 'var(--color-background-secondary)' }}
                  content={<ChartTooltipContent />}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28}>
                  {data.map((entry) => (
                    <Cell key={entry.level} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>

            {/* Légende avec % */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {data.map((d) => (
                <div key={d.level} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{d.level}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{d.count}</span>
                    <span className="text-xs text-gray-400 ml-1">({d.pct}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">
      Aucune donnée disponible — ajoutez des fournisseurs évalués.
    </div>
  );
}
