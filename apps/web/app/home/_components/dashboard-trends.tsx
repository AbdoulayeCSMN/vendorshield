'use client';

import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import {
  Area,
  AreaChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
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

import type {
  AlertsTrendPoint,
  AssessmentTrendItem,
} from '~/lib/vendorshield/analytics.server';

function Delta({ value, invert = false }: { value: number | null; invert?: boolean }) {
  if (value === null || value === 0) {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-0.5 text-xs">
        <Minus className="h-3 w-3" /> stable
      </span>
    );
  }
  // invert=true : une hausse est négative (ex: alertes).
  const positive = invert ? value < 0 : value > 0;
  const Icon = value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${positive ? 'text-green-600' : 'text-red-600'}`}>
      <Icon className="h-3 w-3" />
      {value > 0 ? '+' : ''}
      {value}
    </span>
  );
}

export function DashboardTrends({
  scoreTrend,
  alertsTrend,
}: {
  scoreTrend: AssessmentTrendItem[];
  alertsTrend: AlertsTrendPoint[];
}) {
  // Delta score : dernier mois noté vs le précédent noté.
  const scored = scoreTrend.filter((s) => s.avg_score !== null);
  const scoreDelta =
    scored.length >= 2
      ? (scored.at(-1)!.avg_score as number) - (scored.at(-2)!.avg_score as number)
      : null;
  const lastScore = scored.at(-1)?.avg_score ?? null;

  // Delta alertes : dernière semaine vs précédente.
  const a = alertsTrend;
  const alertsDelta = a.length >= 2 ? a.at(-1)!.count - a.at(-2)!.count : null;
  const alertsTotal = a.reduce((s, p) => s + p.count, 0);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* Évolution du score moyen */}
      <Card>
        <CardHeader className="pb-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Évolution du score moyen</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tabular-nums">{lastScore ?? '—'}</span>
              <Delta value={scoreDelta} />
            </div>
          </div>
          <CardDescription className="text-xs">12 derniers mois (évaluations)</CardDescription>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scoreTrend} margin={{ top: 6, right: 6, bottom: 0, left: -22 }}>
                <XAxis dataKey="month" tick={{ fontSize: 9 }} interval={1} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: number) => [`${v}/100`, 'Score moyen']} labelStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="avg_score" stroke="#6366f1" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Alertes par semaine */}
      <Card>
        <CardHeader className="pb-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Alertes par semaine</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tabular-nums">{alertsTotal}</span>
              <Delta value={alertsDelta} invert />
            </div>
          </div>
          <CardDescription className="text-xs">8 dernières semaines · vs semaine précédente</CardDescription>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={alertsTrend} margin={{ top: 6, right: 6, bottom: 0, left: -28 }}>
                <defs>
                  <linearGradient id="alertsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: number) => [v, 'Alertes']} labelStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="count" stroke="#f97316" strokeWidth={2} fill="url(#alertsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
