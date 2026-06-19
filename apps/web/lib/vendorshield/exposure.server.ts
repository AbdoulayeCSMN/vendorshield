import 'server-only';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

/**
 * Exposition au risque au niveau de l'organisation (portefeuille fournisseurs) :
 * Spend-at-Risk, concentration (HHI), mono-sources, stress-test.
 */

export interface ExposureContributor {
  id: string;
  name: string;
  spend: number;
  likelihood: number; // 0-1
  sar: number; // contribution au Spend-at-Risk (€)
  risk_level: string | null;
}

export interface OrganizationExposure {
  total_spend: number;
  spend_at_risk: number; // €
  sar_pct: number; // % de la dépense totale
  hhi: number; // 0-10000 (indice de Herfindahl)
  concentration_level: 'low' | 'moderate' | 'high';
  sole_source_count: number;
  sole_source_spend: number;
  top3_share: number; // % de la dépense sur les 3 plus gros fournisseurs (stress-test)
  by_risk: { level: string; spend: number; count: number }[];
  contributors: ExposureContributor[]; // top contributeurs au SaR
  supplier_count: number;
}

const RISK_ORDER = ['critical', 'high', 'medium', 'low'];

export async function getOrganizationExposure(): Promise<OrganizationExposure> {
  const client = getSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from('supplier_risk_summary')
    .select('id,name,global_score,risk_level,annual_spend_eur,is_sole_source')
    .eq('status', 'active');

  const rows = ((data ?? []) as Record<string, unknown>[]).map((s) => ({
    id: s.id as string,
    name: s.name as string,
    spend: (s.annual_spend_eur as number | null) ?? 0,
    score: (s.global_score as number | null) ?? 50,
    risk_level: (s.risk_level as string | null) ?? null,
    sole_source: (s.is_sole_source as boolean | null) ?? false,
  }));

  const totalSpend = rows.reduce((sum, r) => sum + r.spend, 0);

  // Spend-at-Risk = Σ dépense × probabilité d'incident (1 - score/100).
  const contributors: ExposureContributor[] = rows.map((r) => {
    const likelihood = Math.min(1, Math.max(0, (100 - r.score) / 100));
    return {
      id: r.id,
      name: r.name,
      spend: r.spend,
      likelihood,
      sar: Math.round(r.spend * likelihood),
      risk_level: r.risk_level,
    };
  });
  const spendAtRisk = contributors.reduce((sum, c) => sum + c.sar, 0);

  // HHI sur les parts de dépense (en %).
  const hhi =
    totalSpend > 0
      ? Math.round(
          rows.reduce((sum, r) => {
            const sharePct = (r.spend / totalSpend) * 100;
            return sum + sharePct * sharePct;
          }, 0),
        )
      : 0;
  const concentration_level = hhi > 2500 ? 'high' : hhi > 1500 ? 'moderate' : 'low';

  // Stress-test : part des 3 plus gros fournisseurs.
  const top3Spend = [...rows]
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 3)
    .reduce((sum, r) => sum + r.spend, 0);
  const top3Share = totalSpend > 0 ? Math.round((top3Spend / totalSpend) * 1000) / 10 : 0;

  // Répartition de la dépense par niveau de risque.
  const byRiskMap: Record<string, { spend: number; count: number }> = {};
  for (const r of rows) {
    const lvl = r.risk_level ?? 'unrated';
    byRiskMap[lvl] ??= { spend: 0, count: 0 };
    byRiskMap[lvl].spend += r.spend;
    byRiskMap[lvl].count += 1;
  }
  const by_risk = Object.entries(byRiskMap)
    .map(([level, v]) => ({ level, ...v }))
    .sort((a, b) => RISK_ORDER.indexOf(a.level) - RISK_ORDER.indexOf(b.level));

  const soleSource = rows.filter((r) => r.sole_source);

  return {
    total_spend: Math.round(totalSpend),
    spend_at_risk: spendAtRisk,
    sar_pct: totalSpend > 0 ? Math.round((spendAtRisk / totalSpend) * 1000) / 10 : 0,
    hhi,
    concentration_level,
    sole_source_count: soleSource.length,
    sole_source_spend: Math.round(soleSource.reduce((sum, r) => sum + r.spend, 0)),
    top3_share: top3Share,
    by_risk,
    contributors: contributors.sort((a, b) => b.sar - a.sar).slice(0, 8),
    supplier_count: rows.length,
  };
}
