import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import {
  type DelayModel,
  type DeliveryRow,
  MIN_DATA_POINTS,
  MODEL_VERSION,
  forecastPpm,
  operationalRiskLevel,
  predictDelay,
  trainDelayModel,
} from './model';

const DELIVERY_COLS =
  'supplier_id, planned_date, actual_date, delay_days, on_time, ppm, quantity';

// ─── Modèle global anonymisé (cold-start) ───────────────────────────────────
// Entraîné sur l'historique de livraison de TOUS les comptes, mais ne produit
// que des coefficients agrégés (aucun identifiant de tenant n'est exposé).
// Sert de repli quand un compte n'a pas assez de données pour un modèle fiable.

let _cache: { model: DelayModel | null; at: number } | null = null;

export async function getGlobalBaselineModel(): Promise<DelayModel | null> {
  if (_cache && Date.now() - _cache.at < 5 * 60 * 1000) return _cache.model;
  const admin = getSupabaseServerAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from('supplier_deliveries')
    .select(DELIVERY_COLS)
    .limit(20000);
  const rows = (data ?? []) as DeliveryRow[];
  const model = rows.length >= MIN_DATA_POINTS ? trainDelayModel(rows) : null;
  _cache = { model, at: Date.now() };
  return model;
}

export interface ComputedPrediction {
  delay_probability: number;
  expected_delay_days: number;
  predicted_ppm: number | null;
  ppm_breach_probability: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  data_points: number;
  source: 'ts-account' | 'cold-start-global';
  drivers: { feature: string; contribution: number }[];
}

/**
 * Calcule la prédiction d'un fournisseur. Si le compte a assez d'historique,
 * entraîne un modèle dédié ; sinon utilise le modèle global (cold-start) afin
 * qu'un nouveau client ait quand même une prédiction.
 */
export function computePrediction(
  accountRows: DeliveryRow[],
  supplierRows: DeliveryRow[],
  globalModel: DelayModel | null,
): ComputedPrediction {
  const enough = accountRows.length >= MIN_DATA_POINTS;
  const useGlobal = !enough && globalModel !== null;
  const model = useGlobal ? globalModel! : trainDelayModel(accountRows);

  const delay = predictDelay(model, supplierRows);
  const ppm = forecastPpm(supplierRows);

  return {
    delay_probability: delay.delayProbability,
    expected_delay_days: delay.expectedDelayDays,
    predicted_ppm: ppm.predictedPpm,
    ppm_breach_probability: ppm.breachProbability,
    risk_level: operationalRiskLevel(delay.delayProbability, ppm.breachProbability),
    confidence: useGlobal ? Math.min(delay.confidence, 0.5) : delay.confidence,
    data_points: delay.dataPoints,
    source: useGlobal ? 'cold-start-global' : 'ts-account',
    drivers: delay.topDrivers,
  };
}

function batchExplanation(p: ComputedPrediction, supplierName: string): string {
  const pct = Math.round(p.delay_probability * 100);
  const base =
    p.source === 'cold-start-global'
      ? `Estimation initiale (modèle global) pour ${supplierName}, en attendant assez d'historique propre à votre compte. `
      : `Prédiction pour ${supplierName} basée sur votre historique de livraisons. `;
  return (
    base +
    `Probabilité de retard estimée à ${pct}%` +
    (p.expected_delay_days > 0 ? `, retard moyen attendu ~${p.expected_delay_days} j` : '') +
    (p.predicted_ppm != null ? `, PPM projeté ~${p.predicted_ppm}` : '') +
    `. Niveau de risque opérationnel : ${p.risk_level}.`
  );
}

/**
 * Recalcule et stocke les prédictions de tous les fournisseurs d'un compte
 * ayant un historique de livraison. Pas d'appel LLM (rapide/gratuit) : une
 * explication déterministe est générée. Retourne le nombre de fournisseurs.
 */
export async function recomputeAccountPredictions(
  accountId: string,
  deps: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: SupabaseClient<any>;
    globalModel: DelayModel | null;
  },
): Promise<number> {
  const { client, globalModel } = deps;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: deliveries } = await (client as any)
    .from('supplier_deliveries')
    .select(DELIVERY_COLS)
    .eq('account_id', accountId);
  const rows = (deliveries ?? []) as DeliveryRow[];
  if (rows.length === 0) return 0;

  const bySupplier = new Map<string, DeliveryRow[]>();
  for (const r of rows) {
    if (!r.supplier_id) continue;
    const arr = bySupplier.get(r.supplier_id) ?? [];
    arr.push(r);
    bySupplier.set(r.supplier_id, arr);
  }
  if (bySupplier.size === 0) return 0;

  // Noms (pour l'explication).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sup } = await (client as any)
    .from('suppliers')
    .select('id,name')
    .eq('account_id', accountId);
  const names = new Map<string, string>(
    ((sup ?? []) as { id: string; name: string }[]).map((s) => [s.id, s.name]),
  );

  const generatedAt = new Date().toISOString();
  const upserts = [...bySupplier.entries()].map(([supplierId, supplierRows]) => {
    const p = computePrediction(rows, supplierRows, globalModel);
    return {
      account_id: accountId,
      supplier_id: supplierId,
      delay_probability: p.delay_probability,
      expected_delay_days: p.expected_delay_days,
      predicted_ppm: p.predicted_ppm,
      ppm_breach_probability: p.ppm_breach_probability,
      risk_level: p.risk_level,
      confidence: p.confidence,
      data_points: p.data_points,
      features: { source: p.source, drivers: p.drivers, batch: true },
      explanation: batchExplanation(p, names.get(supplierId) ?? 'Ce fournisseur'),
      model_version: MODEL_VERSION,
      generated_at: generatedAt,
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (client as any)
    .from('delivery_predictions')
    .upsert(upserts, { onConflict: 'account_id,supplier_id' });

  return upserts.length;
}
