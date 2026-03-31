'use server';

import { revalidatePath } from 'next/cache';

import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type BankruptcyRiskZone = 'safe' | 'grey' | 'distress';

export interface BankruptcyPrediction {
  id:                    string;
  supplier_id:           string;
  z_score:               number;
  risk_zone:             BankruptcyRiskZone;
  component_credit:      number | null;
  component_debt:        number | null;
  component_revenue:     number | null;
  component_payments:    number | null;
  component_profitability: number | null;
  component_operational:  number | null;
  component_geopolitical: number | null;
  probability_6m:        number;
  probability_12m:       number;
  probability_24m:       number;
  score_trend_3m:        number | null;
  assessment_count:      number;
  narrative_6m:          string | null;
  narrative_12m:         string | null;
  narrative_24m:         string | null;
  key_risk_factors:      { factor: string; impact: 'high' | 'medium' | 'low'; mitigation: string }[];
  early_warning_signals: string[];
  model_used:            string;
  created_at:            string;
}

export interface PredictionResult {
  success:         boolean;
  prediction_id?:  string;
  z_score?:        number;
  risk_zone?:      BankruptcyRiskZone;
  probability_6m?:  number;
  probability_12m?: number;
  probability_24m?: number;
  mock_mode?:      boolean;
  error?:          string;
}

// ─── Déclencher une prédiction ────────────────────────────────────────────────

export async function triggerBankruptcyPredictionAction(
  supplierId: string,
): Promise<PredictionResult> {
  const client = getSupabaseServerClient();
  const auth   = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };

  const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { success: false, error: 'Configuration Supabase manquante' };
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/bankruptcy-predictor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        supplier_id:  supplierId,
        account_id:   auth.data.id,
        triggered_by: auth.data.id,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return { success: false, error: data.error ?? 'Erreur de prédiction' };
    }

    revalidatePath(`/home/suppliers/${supplierId}`);

    return {
      success:        true,
      prediction_id:  data.prediction_id,
      z_score:        data.z_score,
      risk_zone:      data.risk_zone,
      probability_6m:  data.probability_6m,
      probability_12m: data.probability_12m,
      probability_24m: data.probability_24m,
      mock_mode:      data.mock_mode ?? false,
    };
  } catch (err) {
    return {
      success: false,
      error:   `Impossible de contacter l'Edge Function : ${(err as Error).message}`,
    };
  }
}

// ─── Récupérer les prédictions d'un fournisseur ───────────────────────────────

export async function getSupplierPredictions(
  supplierId: string,
  limit = 3,
): Promise<BankruptcyPrediction[]> {
  const client = getSupabaseServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from('bankruptcy_predictions')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[getSupplierPredictions]', error.message);
    return [];
  }
  return (data ?? []) as BankruptcyPrediction[];
}

// ─── Vue d'ensemble pour le dashboard ────────────────────────────────────────

export async function getBankruptcyOverview(): Promise<{
  distress_count: number;
  grey_count:     number;
  safe_count:     number;
  latest:         (BankruptcyPrediction & { supplier_name: string; annual_spend_eur: number | null })[];
}> {
  const client = getSupabaseServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from('supplier_bankruptcy_latest')
    .select('*')
    .order('probability_12m', { ascending: false })
    .limit(20);

  const rows = (data ?? []) as (BankruptcyPrediction & {
    supplier_name: string; annual_spend_eur: number | null;
  })[];

  return {
    distress_count: rows.filter(r => r.risk_zone === 'distress').length,
    grey_count:     rows.filter(r => r.risk_zone === 'grey').length,
    safe_count:     rows.filter(r => r.risk_zone === 'safe').length,
    latest:         rows.slice(0, 10),
  };
}
