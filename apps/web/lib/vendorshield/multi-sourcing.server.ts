import 'server-only';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

/**
 * Moteur de recommandations multi-sourcing (règles).
 * Identifie les fournisseurs critiques mono-source / à risque, compte les
 * alternatives disponibles dans la même catégorie, et propose une action de
 * diversification. Sert de socle factuel au conseil narratif (LLM).
 */

export interface SourcingAlternative {
  id: string;
  name: string;
  risk_level: string | null;
  global_score: number | null;
  country_code: string | null;
}

export interface SourcingRecommendation {
  supplier_id: string;
  supplier_name: string;
  category: string | null;
  criticality: string | null;
  risk_level: string | null;
  spend: number;
  is_sole_source: boolean;
  alternatives_count: number;
  alternatives: SourcingAlternative[];
  level: 'critical' | 'high' | 'medium';
  action: 'qualify_second_source' | 'diversify' | 'monitor';
  rationale: string;
}

export interface MultiSourcingResult {
  recommendations: SourcingRecommendation[];
  single_supplier_categories: { category: string; spend: number }[];
  exposed_spend: number;
  count: number;
}

interface Row {
  id: string;
  name: string;
  category: string | null;
  criticality: string | null;
  risk_level: string | null;
  global_score: number | null;
  is_sole_source: boolean;
  spend: number;
  country_code: string | null;
}

const LEVEL_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2 };
const RISK_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const HIGH_CRIT = new Set(['critical', 'high']);

export async function getMultiSourcingRecommendations(): Promise<MultiSourcingResult> {
  const client = getSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from('suppliers')
    .select(
      'id,name,category,criticality,risk_level,global_score,is_sole_source,annual_spend_eur,country_code,status',
    )
    .eq('status', 'active');

  const rows: Row[] = ((data ?? []) as Record<string, unknown>[]).map((s) => ({
    id: s.id as string,
    name: s.name as string,
    category: (s.category as string | null) ?? null,
    criticality: (s.criticality as string | null) ?? null,
    risk_level: (s.risk_level as string | null) ?? null,
    global_score: (s.global_score as number | null) ?? null,
    is_sole_source: (s.is_sole_source as boolean | null) ?? false,
    spend: (s.annual_spend_eur as number | null) ?? 0,
    country_code: (s.country_code as string | null) ?? null,
  }));

  // Pool d'alternatives par catégorie.
  const byCategory = new Map<string, Row[]>();
  for (const r of rows) {
    if (!r.category) continue;
    const arr = byCategory.get(r.category) ?? [];
    arr.push(r);
    byCategory.set(r.category, arr);
  }

  const single_supplier_categories = [...byCategory.entries()]
    .filter(([, arr]) => arr.length === 1)
    .map(([category, arr]) => ({ category, spend: arr[0]!.spend }))
    .filter((c) => c.spend > 0)
    .sort((a, b) => b.spend - a.spend);

  const recommendations: SourcingRecommendation[] = [];
  let exposed = 0;

  for (const r of rows) {
    const soleCritical = r.is_sole_source && HIGH_CRIT.has(r.criticality ?? '');
    const riskyCritical = HIGH_CRIT.has(r.risk_level ?? '') && HIGH_CRIT.has(r.criticality ?? '');
    const singleCategory = r.category ? (byCategory.get(r.category)?.length ?? 0) === 1 : false;

    if (!soleCritical && !riskyCritical && !(singleCategory && r.spend > 0)) continue;

    const pool = r.category ? (byCategory.get(r.category) ?? []) : [];
    const alternatives = pool
      .filter((p) => p.id !== r.id)
      .sort(
        (a, b) =>
          (RISK_RANK[a.risk_level ?? 'medium'] ?? 2) - (RISK_RANK[b.risk_level ?? 'medium'] ?? 2) ||
          (b.global_score ?? 0) - (a.global_score ?? 0),
      )
      .slice(0, 3)
      .map((p) => ({
        id: p.id,
        name: p.name,
        risk_level: p.risk_level,
        global_score: p.global_score,
        country_code: p.country_code,
      }));
    const altCount = pool.length - 1;

    const level: SourcingRecommendation['level'] =
      (r.is_sole_source || r.risk_level === 'critical') && r.criticality === 'critical'
        ? 'critical'
        : r.criticality === 'high' || r.risk_level === 'high'
          ? 'high'
          : 'medium';

    const action: SourcingRecommendation['action'] =
      altCount <= 0 ? 'qualify_second_source' : 'diversify';

    if (r.is_sole_source || singleCategory) exposed += r.spend;

    const rationale =
      action === 'qualify_second_source'
        ? `Aucune alternative qualifiée en catégorie « ${r.category ?? '—'} ». Risque stratégique : qualifier une 2ᵉ source en priorité.`
        : `${altCount} alternative(s) existante(s) en catégorie « ${r.category ?? '—'} » : répartir le volume pour réduire la dépendance.`;

    recommendations.push({
      supplier_id: r.id,
      supplier_name: r.name,
      category: r.category,
      criticality: r.criticality,
      risk_level: r.risk_level,
      spend: r.spend,
      is_sole_source: r.is_sole_source,
      alternatives_count: Math.max(0, altCount),
      alternatives,
      level,
      action,
      rationale,
    });
  }

  recommendations.sort(
    (a, b) =>
      (LEVEL_RANK[a.level] ?? 3) - (LEVEL_RANK[b.level] ?? 3) || b.spend - a.spend,
  );

  return {
    recommendations,
    single_supplier_categories,
    exposed_spend: Math.round(exposed),
    count: recommendations.length,
  };
}
