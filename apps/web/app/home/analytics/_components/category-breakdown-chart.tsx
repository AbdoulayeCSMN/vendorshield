'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@kit/ui/chart';

import { useTranslation } from 'react-i18next';

import type { CategoryRiskEntry } from '~/lib/vendorshield/analytics.server';
import { useEnumLabels } from '~/lib/vendorshield/use-labels';

interface Props {
  categories: CategoryRiskEntry[];
}

export function CategoryBreakdownChart({ categories }: Props) {
  const { t } = useTranslation('vendorshield');
  const { categoryLabels } = useEnumLabels();

  const chartConfig = {
    low:      { label: t('dashboard.riskLow'),      color: '#22c55e' },
    medium:   { label: t('dashboard.riskMedium'),   color: '#eab308' },
    high:     { label: t('dashboard.riskHigh'),     color: '#f97316' },
    critical: { label: t('dashboard.riskCritical'), color: '#ef4444' },
  } satisfies ChartConfig;

  const data = categories
    .slice(0, 8)
    .map((c) => ({
      category: categoryLabels[c.category as keyof typeof categoryLabels] ?? c.category,
      low:      c.low_count,
      medium:   c.medium_count,
      high:     c.high_count,
      critical: c.critical_count,
      total:    c.supplier_count,
    }));

  const isEmpty = data.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Risques par catégorie</CardTitle>
        <CardDescription>Distribution des niveaux de risque par type de fournisseur</CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-[220px] items-center justify-center text-sm text-gray-400">
            Aucune donnée disponible.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <BarChart
              data={data}
              margin={{ left: 0, right: 8, top: 0, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke="var(--color-border-tertiary)"
              />
              <XAxis
                dataKey="category"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                tickMargin={6}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                width={24}
              />
              <ChartTooltip
                cursor={{ fill: 'var(--color-background-secondary)' }}
                content={<ChartTooltipContent />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="low"      stackId="a" fill={chartConfig.low.color}      radius={[0,0,0,0]} maxBarSize={32} />
              <Bar dataKey="medium"   stackId="a" fill={chartConfig.medium.color}   maxBarSize={32} />
              <Bar dataKey="high"     stackId="a" fill={chartConfig.high.color}     maxBarSize={32} />
              <Bar dataKey="critical" stackId="a" fill={chartConfig.critical.color} radius={[4,4,0,0]} maxBarSize={32} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
