'use client';

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const RISK_COLOR: Record<string, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#d97706',
  low: '#16a34a',
  unrated: '#9ca3af',
};

const RISK_LABEL: Record<string, string> = {
  critical: 'Critique',
  high: 'Élevé',
  medium: 'Moyen',
  low: 'Faible',
  unrated: 'Non évalué',
};

const eur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { notation: 'compact', style: 'currency', currency: 'EUR' }).format(n);

export function ExposureSpendChart({
  data,
}: {
  data: { level: string; spend: number; count: number }[];
}) {
  const rows = data.map((d) => ({ ...d, label: RISK_LABEL[d.level] ?? d.level }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => eur(Number(v))} tick={{ fontSize: 11 }} width={64} />
          <Tooltip
            formatter={(v: number, _n, p) => [`${eur(v)} · ${p.payload.count} fourn.`, 'Dépense']}
            labelFormatter={(l) => `Risque ${l}`}
          />
          <Bar dataKey="spend" radius={[4, 4, 0, 0]}>
            {rows.map((r) => (
              <Cell key={r.level} fill={RISK_COLOR[r.level] ?? '#9ca3af'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
