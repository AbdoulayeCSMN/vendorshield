'use client';

import Link from 'next/link';

import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  Globe,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
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

import type {
  AccountRiskDashboard,
  AssessmentTrendItem,
  CategoryScoreItem,
  CountryExposure,
  DimensionScore,
  RiskDistributionItem,
  SoleSourceItem,
  TopRiskySupplier,
} from '~/lib/vendorshield/analytics.server';
import {
  CATEGORY_LABELS,
  CRITICALITY_LABELS,
  formatEur,
  type RiskLevel,
} from '~/lib/vendorshield/types';
import type { BankruptcyPrediction } from '~/lib/vendorshield/actions/prediction.actions';

// ─── Constantes couleurs ──────────────────────────────────────────────────────

const RISK_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#eab308',
  low:      '#22c55e',
};

const DIMENSION_COLORS: Record<string, string> = {
  financial:    '#3b82f6',
  operational:  '#f97316',
  geopolitical: '#a855f7',
  esg:          '#22c55e',
};

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon,
  colorCls,
  href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  colorCls: string;
  href?: string;
}) {
  const inner = (
    <Card className={`group transition-shadow hover:shadow-md ${href ? 'cursor-pointer' : ''}`}>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">{label}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
              {value}
            </p>
            {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
          </div>
          <div className={`rounded-xl p-2.5 ${colorCls}`}>
            {icon}
          </div>
        </div>
        {href && (
          <div className="mt-3 flex items-center text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            Voir le détail <ArrowUpRight className="ml-1 h-3 w-3" />
          </div>
        )}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

// ─── Score bar inline ─────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-gray-400">—</span>;
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f97316' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <progress
        className={`h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 ${score >= 70 ? 'accent-green-500' : score >= 40 ? 'accent-orange-500' : 'accent-red-500'}`}
        value={score}
        max={100}
      />
      <span className={`text-xs font-semibold tabular-nums w-6 text-right ${score >= 70 ? 'text-green-500' : score >= 40 ? 'text-orange-500' : 'text-red-500'}`}>
        {score}
      </span>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  kpis: AccountRiskDashboard | null;
  riskDistribution: RiskDistributionItem[];
  dimensionScores: DimensionScore[];
  categoryScores: CategoryScoreItem[];
  assessmentTrend: AssessmentTrendItem[];
  topRiskySuppliers: TopRiskySupplier[];
  soleSourceSuppliers: SoleSourceItem[];
  countryExposure: CountryExposure[];
  bankruptcyOverview: {
    distress_count: number;
    grey_count: number;
    safe_count: number;
    latest: (BankruptcyPrediction & {
      supplier_name: string;
      annual_spend_eur: number | null;
    })[];
  };
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function AnalyticsDashboard({
  kpis,
  riskDistribution,
  dimensionScores,
  categoryScores,
  assessmentTrend,
  topRiskySuppliers,
  soleSourceSuppliers,
  countryExposure,
  bankruptcyOverview,
}: Props) {
  const totalRisk = riskDistribution.reduce((s, r) => s + r.count, 0);

  // ── Chart configs Shadcn ──
  const distConfig: ChartConfig = {
    count: { label: 'Fournisseurs' },
    critical: { label: 'Critique',  color: RISK_COLORS.critical },
    high:     { label: 'Élevé',     color: RISK_COLORS.high },
    medium:   { label: 'Modéré',    color: RISK_COLORS.medium },
    low:      { label: 'Faible',    color: RISK_COLORS.low },
  };

  const dimConfig: ChartConfig = {
    avg_score:    { label: 'Score moyen' },
    financial:    { label: 'Financier',      color: DIMENSION_COLORS.financial },
    operational:  { label: 'Opérationnel',   color: DIMENSION_COLORS.operational },
    geopolitical: { label: 'Géopolitique',   color: DIMENSION_COLORS.geopolitical },
    esg:          { label: 'ESG',            color: DIMENSION_COLORS.esg },
  };

  const catConfig: ChartConfig = {
    avg_score: { label: 'Score moyen', color: '#6366f1' },
  };

  const trendConfig: ChartConfig = {
    completed: { label: 'Évaluations',   color: '#6366f1' },
    avg_score: { label: 'Score moyen',   color: '#22c55e' },
  };

  return (
    <div className="space-y-6">

      {/* ── Row 1 : KPIs ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Fournisseurs actifs"
          value={kpis?.active_suppliers ?? '—'}
          sub={`${kpis?.total_suppliers ?? 0} au total`}
          icon={<Building2 className="h-5 w-5 text-blue-600" />}
          colorCls="bg-blue-50 dark:bg-blue-950"
          href="/home/suppliers"
        />
        <KpiCard
          label="Score fiabilité moyen"
          value={kpis?.avg_global_score !== null && kpis?.avg_global_score !== undefined ? `${kpis.avg_global_score}/100` : '—'}
          sub={
            kpis?.avg_global_score
              ? kpis.avg_global_score >= 70 ? 'Risque faible'
              : kpis.avg_global_score >= 40 ? 'Risque modéré'
              : 'Risque élevé'
              : undefined
          }
          icon={<Shield className="h-5 w-5 text-orange-600" />}
          colorCls="bg-orange-50 dark:bg-orange-950"
        />
        <KpiCard
          label="Fournisseurs critiques"
          value={(kpis?.critical_risk_count ?? 0) + (kpis?.high_risk_count ?? 0)}
          sub={`${kpis?.critical_risk_count ?? 0} critiques · ${kpis?.high_risk_count ?? 0} élevés`}
          icon={<ShieldAlert className="h-5 w-5 text-red-600" />}
          colorCls="bg-red-50 dark:bg-red-950"
          href="/home/suppliers?risk_level=critical"
        />
        <KpiCard
          label="Alertes ouvertes"
          value={kpis?.open_alerts_total ?? 0}
          sub={`dont ${kpis?.critical_alerts_total ?? 0} critiques`}
          icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
          colorCls="bg-red-50 dark:bg-red-950"
          href="/home/alerts"
        />
      </div>

      {/* ── Row 2 : Distribution risque + Scores dimensions ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Donut distribution risque */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Distribution des niveaux de risque</CardTitle>
            <CardDescription>{totalRisk} fournisseurs évalués</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              {/* Donut */}
              <ChartContainer config={distConfig} className="h-48 w-48 shrink-0">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
                  <Pie
                    data={riskDistribution}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={76}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {riskDistribution.map((entry) => (
                      <Cell
                        key={entry.level}
                        fill={RISK_COLORS[entry.level] ?? '#ccc'}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>

              {/* Légende avec barres */}
              <div className="flex-1 space-y-3">
                {riskDistribution.map((item) => (
                  <div key={item.level}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full ${item.level === 'critical' ? 'bg-red-500' : item.level === 'high' ? 'bg-orange-500' : item.level === 'medium' ? 'bg-amber-500' : 'bg-green-500'}`} />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                        {item.count}
                        {totalRisk > 0 && (
                          <span className="text-xs font-normal text-gray-400 ml-1">
                            ({Math.round((item.count / totalRisk) * 100)}%)
                          </span>
                        )}
                      </span>
                    </div>
                    <progress
                      className={`h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 ${item.level === 'critical' ? 'accent-red-500' : item.level === 'high' ? 'accent-orange-500' : item.level === 'medium' ? 'accent-amber-500' : 'accent-green-500'}`}
                      value={totalRisk > 0 ? (item.count / totalRisk) * 100 : 0}
                      max={100}
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scores moyens par dimension */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Scores moyens par dimension</CardTitle>
            <CardDescription>Moyenne pondérée de l'ensemble du portefeuille</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={dimConfig} className="h-48">
              <BarChart
                data={dimensionScores}
                layout="vertical"
                margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
              >
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} tickCount={6} />
                <YAxis
                  type="category"
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  width={90}
                  tick={{ fontSize: 12 }}
                />
                <ChartTooltip
                  cursor={{ fill: 'var(--color-muted)', opacity: 0.3 }}
                  content={<ChartTooltipContent />}
                />
                <Bar dataKey="avg_score" name="Score moyen" radius={[0, 4, 4, 0]}>
                  {dimensionScores.map((entry) => (
                    <Cell
                      key={entry.dimension}
                      fill={DIMENSION_COLORS[entry.dimension] ?? '#6366f1'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3 : Tendance évaluations ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Tendance des évaluations — 12 derniers mois</CardTitle>
          <CardDescription>Nombre d'évaluations complétées et score moyen mensuel</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={trendConfig} className="h-56">
            <LineChart
              data={assessmentTrend}
              margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                yAxisId="count"
                orientation="left"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                width={24}
              />
              <YAxis
                yAxisId="score"
                orientation="right"
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                width={28}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                yAxisId="count"
                type="monotone"
                dataKey="completed"
                name="Évaluations"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ fill: '#6366f1', r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="score"
                type="monotone"
                dataKey="avg_score"
                name="Score moyen"
                stroke="#22c55e"
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={false}
                connectNulls
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* ── Row 4 : Score par catégorie ── */}
      {categoryScores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Score moyen par catégorie fournisseur</CardTitle>
            <CardDescription>Du plus risqué (gauche) au moins risqué (droite)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={catConfig} className="h-52">
              <BarChart
                data={categoryScores}
                margin={{ top: 0, right: 8, bottom: 24, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  angle={-30}
                  textAnchor="end"
                  height={40}
                />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={24} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name, item) =>
                        [`${value}/100 (${item.payload.count} fournisseurs)`, 'Score moyen']
                      }
                    />
                  }
                />
                <Bar dataKey="avg_score" name="Score moyen" radius={[4, 4, 0, 0]}>
                  {categoryScores.map((entry) => (
                    <Cell
                      key={entry.category}
                      fill={
                        entry.avg_score >= 70
                          ? '#22c55e'
                          : entry.avg_score >= 40
                            ? '#f97316'
                            : '#ef4444'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Row 5 : Top risqués + Pays ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Top 10 fournisseurs risqués */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold">Fournisseurs les plus risqués</CardTitle>
              <CardDescription>Score global les plus bas (actifs)</CardDescription>
            </div>
            <Link href="/home/suppliers?sort=global_score&order=asc" className="text-xs text-primary hover:underline flex items-center gap-1">
              Voir tous <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {topRiskySuppliers.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Aucun fournisseur évalué</p>
            ) : (
              topRiskySuppliers.map((s, i) => (
                <Link
                  key={s.id}
                  href={`/home/suppliers/${s.id}`}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                >
                  <span className="text-xs text-gray-400 w-4 tabular-nums shrink-0">{i + 1}</span>
                  <span className="text-base shrink-0">
                    {s.country_code ? countryFlag(s.country_code) : '🏢'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {s.name}
                    </p>
                    <ScoreBar score={s.global_score} />
                  </div>
                  {s.critical_alerts > 0 && (
                    <span className="shrink-0 text-xs font-medium text-red-600 bg-red-50 rounded-full px-1.5 py-0.5">
                      {s.critical_alerts}⚠
                    </span>
                  )}
                  <ArrowUpRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-primary shrink-0" />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Exposition pays */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Exposition géographique</CardTitle>
            <CardDescription>Pays avec le score moyen le plus bas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {countryExposure.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Aucune donnée géographique</p>
            ) : (
              countryExposure.map((c) => (
                <div key={c.country_code} className="flex items-center gap-3 py-1.5">
                  <span className="text-lg shrink-0">{countryFlag(c.country_code)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{c.country_name}</p>
                      <span className="text-xs text-gray-400 shrink-0 ml-2">{c.count} fournisseur{c.count > 1 ? 's' : ''}</span>
                    </div>
                    <ScoreBar score={c.avg_score} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 6 : Bankruptcy overview ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-rose-500" />
                Bankruptcy Overview
              </CardTitle>
              <CardDescription>
                Projection Altman Z-score sur les fournisseurs les plus exposés
              </CardDescription>
            </div>
            <Link href="/home/suppliers?sort=global_score&order=asc" className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0">
              Voir fournisseurs <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-red-700">Distress</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-red-700">{bankruptcyOverview.distress_count}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-amber-700">Grey Zone</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-amber-700">{bankruptcyOverview.grey_count}</p>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-green-700">Safe</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-green-700">{bankruptcyOverview.safe_count}</p>
            </div>
          </div>

          <div className="space-y-2">
            {bankruptcyOverview.latest.length === 0 ? (
              <p className="text-sm text-gray-400 py-3 text-center">Aucune prédiction de faillite disponible</p>
            ) : (
              bankruptcyOverview.latest.slice(0, 5).map((row) => {
                const zoneClass =
                  row.risk_zone === 'distress'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : row.risk_zone === 'grey'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-green-50 text-green-700 border-green-200';

                return (
                  <Link
                    key={row.id}
                    href={`/home/suppliers/${row.supplier_id}`}
                    className="flex items-center gap-3 rounded-lg p-2.5 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{row.supplier_name}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Z-score {row.z_score.toFixed(2)} · 12m {Math.round(row.probability_12m)}%
                        {row.annual_spend_eur ? ` · ${formatEur(row.annual_spend_eur)}` : ''}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${zoneClass}`}>
                      {row.risk_zone}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Row 7 : Sole source ── */}
      {soleSourceSuppliers.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Exposition sole source
                </CardTitle>
                <CardDescription>
                  {soleSourceSuppliers.length} fournisseur{soleSourceSuppliers.length > 1 ? 's uniques' : ' unique'} —
                  dépendance totale sans alternative disponible
                </CardDescription>
              </div>
              <Link href="/home/suppliers?sort=global_score&order=asc" className="text-xs text-primary hover:underline flex items-center gap-1">
                Voir tous <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left text-xs font-medium text-gray-500 pb-2">Fournisseur</th>
                    <th className="text-left text-xs font-medium text-gray-500 pb-2 hidden md:table-cell">Criticité</th>
                    <th className="text-left text-xs font-medium text-gray-500 pb-2 hidden lg:table-cell">Dépense annuelle</th>
                    <th className="text-left text-xs font-medium text-gray-500 pb-2 w-40">Score fiabilité</th>
                  </tr>
                </thead>
                <tbody>
                  {soleSourceSuppliers.map((s) => (
                    <tr key={s.id} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                      <td className="py-2.5 pr-4">
                        <Link href={`/home/suppliers/${s.id}`} className="flex items-center gap-2 hover:text-primary">
                          <span>{s.country_code ? countryFlag(s.country_code) : '🏢'}</span>
                          <span className="font-medium text-gray-900 dark:text-white truncate max-w-[150px]">{s.name}</span>
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4 hidden md:table-cell">
                        <span className={`text-xs rounded-full px-2 py-0.5 ${
                          s.criticality === 'critical' ? 'bg-red-50 text-red-700' :
                          s.criticality === 'high' ? 'bg-orange-50 text-orange-700' :
                          'bg-gray-50 text-gray-600'
                        }`}>
                          {CRITICALITY_LABELS[s.criticality as keyof typeof CRITICALITY_LABELS] ?? s.criticality}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-sm text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                        {s.annual_spend_eur ? formatEur(s.annual_spend_eur) : '—'}
                      </td>
                      <td className="py-2.5 w-40">
                        <ScoreBar score={s.global_score} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function countryFlag(code: string): string {
  const c = code.trim().toUpperCase();
  if (c.length !== 2) return '🏳';
  return c.split('').map((ch) =>
    String.fromCodePoint(0x1f1e6 + ch.charCodeAt(0) - 65)
  ).join('');
}
