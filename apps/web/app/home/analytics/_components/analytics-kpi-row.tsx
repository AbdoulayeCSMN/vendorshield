'use client';

import {
  AlertTriangle,
  Building2,
  CheckCircle,
  Shield,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';

import type { AccountRiskDashboard } from '~/lib/vendorshield/types';

interface Props {
  kpis: AccountRiskDashboard | null;
}

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  valueColor?: string;
}

function KpiCard({ title, value, subtitle, icon, iconBg, valueColor = 'text-gray-900 dark:text-white' }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={`rounded-lg p-2 ${iconBg}`}>{icon}</div>
      </div>
      <p className={`text-2xl font-bold tabular-nums ${valueColor}`}>{value}</p>
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-0.5">{title}</p>
      <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
    </div>
  );
}

export function AnalyticsKpiRow({ kpis }: Props) {
  const avgScore = kpis?.avg_global_score ?? null;
  const scoreColor =
    avgScore === null ? 'text-gray-400'
    : avgScore >= 70 ? 'text-green-600'
    : avgScore >= 40 ? 'text-orange-600'
    : 'text-red-600';

  const criticalAndHigh = (kpis?.critical_risk_count ?? 0) + (kpis?.high_risk_count ?? 0);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      <KpiCard
        title="Fournisseurs actifs"
        value={kpis?.active_suppliers ?? '—'}
        subtitle={`sur ${kpis?.total_suppliers ?? '—'} au total`}
        icon={<Building2 className="h-4 w-4 text-blue-600" />}
        iconBg="bg-blue-50 dark:bg-blue-950"
      />
      <KpiCard
        title="Score moyen"
        value={avgScore !== null ? `${avgScore}/100` : '—'}
        subtitle="Score global agrégé"
        icon={<Shield className="h-4 w-4 text-purple-600" />}
        iconBg="bg-purple-50 dark:bg-purple-950"
        valueColor={scoreColor}
      />
      <KpiCard
        title="Risque critique/élevé"
        value={criticalAndHigh}
        subtitle={`${kpis?.critical_risk_count ?? 0} critiques, ${kpis?.high_risk_count ?? 0} élevés`}
        icon={<ShieldAlert className="h-4 w-4 text-red-600" />}
        iconBg="bg-red-50 dark:bg-red-950"
        valueColor={criticalAndHigh > 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}
      />
      <KpiCard
        title="Risque faible"
        value={kpis?.low_risk_count ?? '—'}
        subtitle="Fournisseurs score ≥ 70"
        icon={<CheckCircle className="h-4 w-4 text-green-600" />}
        iconBg="bg-green-50 dark:bg-green-950"
        valueColor="text-green-600"
      />
      <KpiCard
        title="Alertes ouvertes"
        value={kpis?.open_alerts_total ?? '—'}
        subtitle={`dont ${kpis?.critical_alerts_total ?? 0} critiques`}
        icon={<AlertTriangle className="h-4 w-4 text-orange-600" />}
        iconBg="bg-orange-50 dark:bg-orange-950"
        valueColor={(kpis?.open_alerts_total ?? 0) > 0 ? 'text-orange-600' : 'text-gray-900 dark:text-white'}
      />
      <KpiCard
        title="Sole sources"
        value={kpis?.sole_source_count ?? '—'}
        subtitle="Fournisseurs uniques — risque élevé"
        icon={<TrendingUp className="h-4 w-4 text-amber-600" />}
        iconBg="bg-amber-50 dark:bg-amber-950"
        valueColor={(kpis?.sole_source_count ?? 0) > 0 ? 'text-amber-600' : 'text-gray-900 dark:text-white'}
      />
    </div>
  );
}
