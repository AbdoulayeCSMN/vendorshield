import 'server-only';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import type {
  AccountRiskDashboard,
  SupplierRiskSummary,
} from '~/lib/vendorshield/types';

export type { AccountRiskDashboard } from '~/lib/vendorshield/types';

// Alias de compatibilité utilisés par les composants analytics.
export type ScoreTrendPoint = AssessmentTrendItem;
export type GeoRiskEntry = CountryExposure;
export type CategoryRiskEntry = CategoryScoreItem;

// ─── KPIs globaux (vue SQL account_risk_dashboard) ────────────────────────────

export async function getAnalyticsDashboard(): Promise<AccountRiskDashboard | null> {
  const client = getSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from('account_risk_dashboard')
    .select('*')
    .single();
  return data as AccountRiskDashboard | null;
}

// ─── Distribution par niveau de risque ───────────────────────────────────────

export interface RiskDistributionItem {
  level: string;
  label: string;
  count: number;
  fill: string;
}

export async function getRiskDistribution(): Promise<RiskDistributionItem[]> {
  const client = getSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from('suppliers')
    .select('risk_level')
    .neq('status', 'blacklisted');

  const rows = (data ?? []) as Array<{ risk_level: 'critical' | 'high' | 'medium' | 'low' | null }>;
  const counts: { critical: number; high: number; medium: number; low: number } = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  for (const row of rows) {
    const key = row.risk_level;
    if (key) {
      counts[key] += 1;
    }
  }
  return [
    { level: 'critical', label: 'Critique', count: counts.critical, fill: 'var(--color-critical)' },
    { level: 'high',     label: 'Élevé',    count: counts.high,     fill: 'var(--color-high)' },
    { level: 'medium',   label: 'Modéré',   count: counts.medium,   fill: 'var(--color-medium)' },
    { level: 'low',      label: 'Faible',   count: counts.low,      fill: 'var(--color-low)' },
  ];
}

// ─── Score moyen par catégorie ────────────────────────────────────────────────

export interface CategoryScoreItem {
  category: string;
  label: string;
  avg_score: number;
  count: number;
  supplier_count: number;
  low_count: number;
  medium_count: number;
  high_count: number;
  critical_count: number;
}

const CATEGORY_LABELS_MAP: Record<string, string> = {
  raw_materials: 'Matières 1ères', components: 'Composants',
  logistics: 'Logistique',        services: 'Services',
  technology: 'Technologie',      energy: 'Énergie',
  chemicals: 'Chimie',            packaging: 'Emballage',
  maintenance: 'Maintenance',     other: 'Autre',
};

export async function getScoresByCategory(): Promise<CategoryScoreItem[]> {
  const client = getSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from('suppliers')
    .select('category, global_score, risk_level')
    .neq('status', 'blacklisted')
    .not('global_score', 'is', null);

  const rows = (data ?? []) as Array<{
    category: string | null;
    global_score: number;
    risk_level: 'critical' | 'high' | 'medium' | 'low' | null;
  }>;

  type Group = {
    scores: number[];
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  const groups: Record<string, Group> = {};
  for (const row of rows) {
    const category = row.category ?? 'other';
    const g = (groups[category] ??= {
      scores: [],
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    });
    g.scores.push(row.global_score);
    if (row.risk_level) g[row.risk_level] += 1;
  }

  return Object.entries(groups)
    .map(([cat, g]) => ({
      category: cat,
      label: CATEGORY_LABELS_MAP[cat] ?? cat,
      avg_score: Math.round(g.scores.reduce((a, b) => a + b, 0) / g.scores.length),
      count: g.scores.length,
      supplier_count: g.scores.length,
      low_count: g.low,
      medium_count: g.medium,
      high_count: g.high,
      critical_count: g.critical,
    }))
    .sort((a, b) => a.avg_score - b.avg_score);
}

// ─── Scores moyens par dimension ──────────────────────────────────────────────

export interface DimensionScore {
  dimension: string;
  label: string;
  avg_score: number;
  fill: string;
}

export async function getDimensionScores(): Promise<DimensionScore[]> {
  const client = getSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from('suppliers')
    .select('financial_score, operational_score, geopolitical_score, esg_score')
    .neq('status', 'blacklisted');

  if (!data || data.length === 0) return [];

  const avg = (key: string) => {
    const vals = data
      .map((r: Record<string, number | null>) => r[key])
      .filter((v: number | null): v is number => v !== null);
    return vals.length ? Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length) : 0;
  };

  return [
    { dimension: 'financial',    label: 'Financier',      avg_score: avg('financial_score'),    fill: 'var(--color-financial)' },
    { dimension: 'operational',  label: 'Opérationnel',   avg_score: avg('operational_score'),  fill: 'var(--color-operational)' },
    { dimension: 'geopolitical', label: 'Géopolitique',   avg_score: avg('geopolitical_score'), fill: 'var(--color-geopolitical)' },
    { dimension: 'esg',          label: 'ESG',            avg_score: avg('esg_score'),          fill: 'var(--color-esg)' },
  ];
}

// ─── Tendance des évaluations (12 derniers mois) ──────────────────────────────

export interface AssessmentTrendItem {
  month: string;
  completed: number;
  avg_score: number | null;
}

export async function getAssessmentTrend(): Promise<AssessmentTrendItem[]> {
  const client = getSupabaseServerClient();
  const since = new Date();
  since.setMonth(since.getMonth() - 11);
  since.setDate(1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from('risk_assessments')
    .select('assessment_date, global_score')
    .gte('assessment_date', since.toISOString().split('T')[0])
    .in('status', ['completed', 'approved']);

  const byMonth: Record<string, { count: number; scores: number[] }> = {};
  for (const row of (data ?? [])) {
    const d = new Date(row.assessment_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!byMonth[key]) byMonth[key] = { count: 0, scores: [] };
    byMonth[key].count++;
    if (row.global_score !== null) byMonth[key].scores.push(row.global_score);
  }

  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    d.setDate(1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const lbl = d.toLocaleDateString('fr-FR', { month: 'short' });
    const entry = byMonth[key];
    return {
      month: lbl.charAt(0).toUpperCase() + lbl.slice(1),
      completed: entry?.count ?? 0,
      avg_score: entry?.scores.length
        ? Math.round(entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length)
        : null,
    };
  });
}

// ─── Top 10 fournisseurs les plus risqués ─────────────────────────────────────

export type TopRiskySupplier = {
  id: string;
  name: string;
  country_code: string | null;
  category: string;
  global_score: number | null;
  financial_score: number | null;
  operational_score: number | null;
  geopolitical_score: number | null;
  esg_score: number | null;
  risk_level: string | null;
  open_alerts: number;
  critical_alerts: number;
  annual_spend_eur: number | null;
};

export async function getTopRiskySuppliers(limit = 10): Promise<TopRiskySupplier[]> {
  const client = getSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from('supplier_risk_summary')
    .select('id,name,country_code,category,global_score,financial_score,operational_score,geopolitical_score,esg_score,risk_level,open_alerts,critical_alerts,annual_spend_eur')
    .not('global_score', 'is', null)
    .eq('status', 'active')
    .order('global_score', { ascending: true })
    .limit(limit);
  return (data ?? []) as TopRiskySupplier[];
}

// ─── Cartographie des risques (matrice probabilité × impact) ──────────────────

export type RiskMatrixPoint = {
  id: string;
  name: string;
  country_code: string | null;
  criticality: string | null;
  risk_level: string | null;
  /** Probabilité d'incident 0-100 (dérivée du score : faible score = forte proba). */
  likelihood: number;
  /** Impact business 0-100 (criticité). */
  impact: number;
  annual_spend_eur: number | null;
};

const CRITICALITY_IMPACT: Record<string, number> = {
  critical: 95,
  high: 72,
  medium: 48,
  low: 25,
};

export async function getRiskMatrix(): Promise<RiskMatrixPoint[]> {
  const client = getSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from('supplier_risk_summary')
    .select('id,name,country_code,criticality,risk_level,global_score,annual_spend_eur')
    .eq('status', 'active')
    .not('global_score', 'is', null);

  return ((data ?? []) as Record<string, unknown>[]).map((s) => {
    const score = (s.global_score as number | null) ?? 50;
    return {
      id: s.id as string,
      name: s.name as string,
      country_code: (s.country_code as string | null) ?? null,
      criticality: (s.criticality as string | null) ?? null,
      risk_level: (s.risk_level as string | null) ?? null,
      likelihood: Math.round(100 - score), // faible score → forte probabilité d'incident
      impact: CRITICALITY_IMPACT[(s.criticality as string) ?? 'medium'] ?? 48,
      annual_spend_eur: (s.annual_spend_eur as number | null) ?? null,
    };
  });
}

// ─── Sole source exposure ─────────────────────────────────────────────────────

export type SoleSourceItem = {
  id: string;
  name: string;
  country_code: string | null;
  category: string;
  global_score: number | null;
  risk_level: string | null;
  annual_spend_eur: number | null;
  criticality: string;
};

export async function getSoleSourceExposure(): Promise<SoleSourceItem[]> {
  const client = getSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from('suppliers')
    .select('id,name,country_code,category,global_score,risk_level,annual_spend_eur,criticality')
    .eq('is_sole_source', true)
    .eq('status', 'active')
    .order('global_score', { ascending: true, nullsFirst: true });
  return (data ?? []) as SoleSourceItem[];
}

// ─── Top pays par exposition ──────────────────────────────────────────────────

export interface CountryExposure {
  country_code: string;
  country_name: string;
  count: number;
  supplier_count: number;
  avg_score: number | null;
  total_spend: number;
  critical_count: number;
  high_count: number;
}

export async function getCountryExposure(): Promise<CountryExposure[]> {
  const client = getSupabaseServerClient();
  // Utilise supplier_risk_summary (vue) plutôt que suppliers directement
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from('supplier_risk_summary')
    .select('country_code,country_name,global_score,annual_spend_eur,status,risk_level')
    .neq('status', 'blacklisted')
    .not('country_code', 'is', null);

  if (error) {
    console.error('[getCountryExposure]', error.message);
    return [];
  }
  if (!data || data.length === 0) return [];

  const groups: Record<
    string,
    { name: string; scores: number[]; spend: number; count: number; critical: number; high: number }
  > = {};
  for (const row of data) {
    const cc = (row.country_code as string).trim(); // trim pour CHAR(2) padding
    if (!groups[cc])
      groups[cc] = { name: row.country_name ?? cc, scores: [], spend: 0, count: 0, critical: 0, high: 0 };
    groups[cc].count++;
    groups[cc].spend += row.annual_spend_eur ?? 0;
    if (row.global_score !== null) groups[cc].scores.push(row.global_score);
    if (row.risk_level === 'critical') groups[cc].critical++;
    else if (row.risk_level === 'high') groups[cc].high++;
  }
  return Object.entries(groups)
    .map(([code, g]) => ({
      country_code: code,
      country_name: g.name,
      count: g.count,
      supplier_count: g.count,
      avg_score: g.scores.length
        ? Math.round(g.scores.reduce((a, b) => a + b, 0) / g.scores.length)
        : null,
      total_spend: g.spend,
      critical_count: g.critical,
      high_count: g.high,
    }))
    .sort((a, b) => (a.avg_score ?? 999) - (b.avg_score ?? 999))
    .slice(0, 10);
}

// ─── Données réseau fournisseurs (pour le graph) ──────────────────────────────

export interface SupplierNode {
  id: string;
  name: string;
  country_code: string | null;
  category: string;
  criticality: string;
  global_score: number | null;
  financial_score: number | null;
  operational_score: number | null;
  geopolitical_score: number | null;
  esg_score: number | null;
  risk_level: string | null;
  is_sole_source: boolean;
  annual_spend_eur: number | null;
  open_alerts: number;
}

export async function getSuppliersForNetwork(): Promise<SupplierNode[]> {
  const client = getSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from('supplier_risk_summary')
    .select('id,name,country_code,category,criticality,global_score,financial_score,operational_score,geopolitical_score,esg_score,risk_level,is_sole_source,annual_spend_eur,open_alerts')
    .eq('status', 'active')
    .limit(50);
  return (data ?? []) as SupplierNode[];
}

// ─── Fournisseurs filtrés par pays (pour les graphes interconnectés) ──────────

export async function getSuppliersByCountry(countryCode: string): Promise<SupplierNode[]> {
  const client = getSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from('supplier_risk_summary')
    .select('id,name,country_code,category,criticality,global_score,financial_score,operational_score,geopolitical_score,esg_score,risk_level,is_sole_source,annual_spend_eur,open_alerts')
    .eq('country_code', countryCode)
    .neq('status', 'blacklisted');
  return (data ?? []) as SupplierNode[];
}
