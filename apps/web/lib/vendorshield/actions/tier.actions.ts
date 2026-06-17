'use server';

import { revalidatePath } from 'next/cache';

import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type TierRiskLevel = 'low' | 'medium' | 'high' | 'critical' | 'unknown';
export type TierImpact    = 'high' | 'medium' | 'low';

export interface TierNode {
  id:                       string;
  tier_level:               number;    // 1 = Tier 1 réel, 2-4 = inférés IA
  name:                     string;
  category:                 string;
  country_code:             string | null;
  country_name:             string | null;
  inferred_role:            string | null;
  estimated_risk_level:     TierRiskLevel | null;
  estimated_score:          number | null;
  supply_chain_impact:      TierImpact | null;
  is_estimated_sole_source: boolean;
  annual_spend_eur:         number | null;
  ai_rationale:             string | null;
  confidence:               number | null;
  is_real:                  boolean;
  parent_supplier_id:       string | null;
}

export interface TierLink {
  id:              string;
  from_supplier_id: string | null;
  from_tier_id:    string | null;
  to_tier_id:      string;
  link_type:       string;
}

export interface SupplyChainGraph {
  nodes: TierNode[];
  links: TierLink[];
  root_supplier_id: string;
}

export interface TierBuildResult {
  success:       boolean;
  tier2_count?:  number;
  tier3_count?:  number;
  mock_mode?:    boolean;
  error?:        string;
}

// ─── Déclencher l'enrichissement multi-tiers ──────────────────────────────────

export async function buildSupplyChainTiersAction(
  supplierId: string,
): Promise<TierBuildResult> {
  const client = getSupabaseServerClient();
  const auth   = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };

  const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return { success: false, error: 'Config Supabase manquante' };

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/tier-builder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseAnonKey}` },
      body: JSON.stringify({ supplier_id: supplierId, account_id: auth.data.id }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) return { success: false, error: data.error ?? 'Erreur Edge Function' };

    revalidatePath(`/home/suppliers/${supplierId}`);
    revalidatePath('/home/supply-chain');

    return { success: true, tier2_count: data.tier2_count, tier3_count: data.tier3_count, mock_mode: data.mock_mode };
  } catch (err) {
    return { success: false, error: `Impossible de contacter l'Edge Function : ${(err as Error).message}` };
  }
}

// ─── Récupérer le graph d'un fournisseur ─────────────────────────────────────

export async function getSupplyChainGraph(supplierId: string): Promise<SupplyChainGraph> {
  const client = getSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = client as any;

  // Nœud Tier 1 (le fournisseur réel)
  const { data: t1 } = await c
    .from('suppliers')
    .select('id,name,category,country_code,country_name,global_score,risk_level,is_sole_source,annual_spend_eur,criticality')
    .eq('id', supplierId)
    .maybeSingle();

  // Nœuds Tier 2/3/4
  const { data: tiers } = await c
    .from('supplier_tiers')
    .select('*')
    .eq('parent_supplier_id', supplierId)
    .order('tier_level')
    .order('supply_chain_impact');

  // Liens
  const { data: links } = await c
    .from('supplier_tier_links')
    .select('*')
    .eq('account_id', t1?.account_id ?? '');

  const nodes: TierNode[] = [];

  if (t1) {
    nodes.push({
      id:                       t1.id,
      tier_level:               1,
      name:                     t1.name,
      category:                 t1.category,
      country_code:             t1.country_code,
      country_name:             t1.country_name,
      inferred_role:            null,
      estimated_risk_level:     t1.risk_level,
      estimated_score:          t1.global_score,
      supply_chain_impact:      t1.criticality as TierImpact,
      is_estimated_sole_source: t1.is_sole_source,
      annual_spend_eur:         t1.annual_spend_eur,
      ai_rationale:             null,
      confidence:               100,
      is_real:                  true,
      parent_supplier_id:       null,
    });
  }

  for (const t of (tiers ?? [])) {
    nodes.push({
      id:                       t.id,
      tier_level:               t.tier_level,
      name:                     t.name,
      category:                 t.category,
      country_code:             t.country_code,
      country_name:             t.country_name,
      inferred_role:            t.inferred_role,
      estimated_risk_level:     t.estimated_risk_level,
      estimated_score:          t.estimated_score,
      supply_chain_impact:      t.supply_chain_impact,
      is_estimated_sole_source: t.is_estimated_sole_source,
      annual_spend_eur:         null,
      ai_rationale:             t.ai_rationale,
      confidence:               t.confidence,
      is_real:                  false,
      parent_supplier_id:       t.parent_supplier_id,
    });
  }

  return {
    nodes,
    links:            (links ?? []) as TierLink[],
    root_supplier_id: supplierId,
  };
}

// ─── Vue d'ensemble supply chain (tous fournisseurs) ─────────────────────────

export async function getSupplyChainOverview(): Promise<{
  total_tier1:    number;
  total_tier2:    number;
  total_tier3:    number;
  critical_tiers: { name: string; tier_level: number; estimated_risk_level: string; supplier_name: string }[];
}> {
  const client = getSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = client as any;

  const [t1Res, t2Res, critRes] = await Promise.all([
    c.from('suppliers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    c.from('supplier_tiers').select('tier_level', { count: 'exact' }),
    c.from('supplier_tiers')
      .select('name,tier_level,estimated_risk_level,parent:suppliers!parent_supplier_id(name)')
      .in('estimated_risk_level', ['critical', 'high'])
      .order('tier_level')
      .limit(10),
  ]);

  const tier2Count = (t2Res.data ?? []).filter((t: { tier_level: number }) => t.tier_level === 2).length;
  const tier3Count = (t2Res.data ?? []).filter((t: { tier_level: number }) => t.tier_level === 3).length;

  return {
    total_tier1:    t1Res.count ?? 0,
    total_tier2:    tier2Count,
    total_tier3:    tier3Count,
    critical_tiers: (critRes.data ?? []).map((t: {
      name: string; tier_level: number; estimated_risk_level: string;
      parent: { name: string } | null;
    }) => ({
      name:                 t.name,
      tier_level:           t.tier_level,
      estimated_risk_level: t.estimated_risk_level,
      supplier_name:        t.parent?.name ?? '—',
    })),
  };
}
