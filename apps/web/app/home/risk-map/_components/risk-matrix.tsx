'use client';

import { useRouter } from 'next/navigation';

import {
  CartesianGrid,
  Cell,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';

import { useTranslation } from 'react-i18next';

import type { RiskMatrixPoint } from '~/lib/vendorshield/analytics.server';
import { useEnumLabels } from '~/lib/vendorshield/use-labels';

const RISK_COLOR: Record<string, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#d97706',
  low: '#16a34a',
};

function colorFor(level: string | null): string {
  return RISK_COLOR[level ?? 'low'] ?? '#6b7280';
}

interface Datum extends RiskMatrixPoint {
  x: number;
  y: number;
  z: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MatrixTooltip({ active, payload }: any) {
  const { t, i18n } = useTranslation('vendorshield');
  if (!active || !payload?.length) return null;
  const d: Datum = payload[0].payload;
  return (
    <div className="bg-background rounded-lg border p-2 text-xs shadow-md">
      <div className="font-semibold">{d.name}</div>
      <div className="text-muted-foreground">
        {t('riskMatrix.tooltipProb', { likelihood: d.likelihood, impact: d.impact })}
      </div>
      <div className="text-muted-foreground">
        {t('riskMatrix.tooltipCrit', { val: d.criticality ?? '—' })}
        {d.annual_spend_eur
          ? ` · ${new Intl.NumberFormat(i18n.language, { notation: 'compact', style: 'currency', currency: 'EUR' }).format(d.annual_spend_eur)}`
          : ''}
      </div>
      <div className="text-primary mt-1">{t('riskMatrix.tooltipClick')}</div>
    </div>
  );
}

export function RiskMatrix({ points }: { points: RiskMatrixPoint[] }) {
  const { t } = useTranslation('vendorshield');
  const { riskLevelLabels } = useEnumLabels();
  const router = useRouter();
  const data: Datum[] = points.map((p) => ({
    ...p,
    x: p.likelihood,
    y: p.impact,
    z: p.annual_spend_eur ?? 1,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('riskMatrix.title')}</CardTitle>
        <CardDescription>{t('riskMatrix.desc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[460px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 16, right: 24, bottom: 28, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              {/* Quadrant critique (haut-droit) */}
              <ReferenceArea x1={50} x2={100} y1={50} y2={100} fill="#dc2626" fillOpacity={0.05} />
              <ReferenceLine x={50} stroke="#9ca3af" strokeDasharray="4 4" />
              <ReferenceLine y={50} stroke="#9ca3af" strokeDasharray="4 4" />
              <XAxis
                type="number"
                dataKey="x"
                name={t('riskMatrix.probability')}
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                label={{ value: t('riskMatrix.probabilityAxis'), position: 'bottom', fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name={t('riskMatrix.impactAxis')}
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                label={{ value: t('riskMatrix.impactAxis'), angle: -90, position: 'insideLeft', fontSize: 11 }}
              />
              <ZAxis type="number" dataKey="z" range={[60, 600]} name={t('riskMatrix.spend')} />
              <Tooltip content={<MatrixTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter
                data={data}
                onClick={(d: unknown) =>
                  router.push(`/home/suppliers/${(d as Datum).id}`)
                }
                className="cursor-pointer"
              >
                {data.map((d) => (
                  <Cell key={d.id} fill={colorFor(d.risk_level)} fillOpacity={0.75} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="text-muted-foreground mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {(['critical', 'high', 'medium', 'low'] as const).map((k) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorFor(k) }} />
              {riskLevelLabels[k]}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
