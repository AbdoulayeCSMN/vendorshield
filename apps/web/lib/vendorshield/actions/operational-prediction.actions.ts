'use server';

import { revalidatePath } from 'next/cache';

import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { openRouterComplete } from '~/lib/ai/openrouter.server';
import { denyIfDemo } from '~/lib/vendorshield/demo';
import {
  type DeliveryRow,
  MIN_DATA_POINTS,
  MODEL_VERSION,
  forecastPpm,
  operationalRiskLevel,
  predictDelay,
  trainDelayModel,
} from '~/lib/vendorshield/predictions/model';

type ActionResult<T = null> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string };

export interface OperationalPrediction {
  supplier_id: string;
  delay_probability: number;
  expected_delay_days: number;
  predicted_ppm: number | null;
  ppm_breach_probability: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  data_points: number;
  explanation: string | null;
  model_version: string;
  generated_at: string;
}

const DRIVER_LABELS: Record<string, string> = {
  otd_anterieur: 'historique de ponctualité',
  retard_moyen_anterieur: 'retard moyen passé',
  quantite: 'volume des commandes',
  ppm: 'niveau de défauts',
  saison_sin: 'saisonnalité',
  saison_cos: 'saisonnalité',
};

function fallbackExplanation(
  delayProb: number,
  expectedDelay: number,
  predictedPpm: number | null,
  ppmBreach: number,
  drivers: { feature: string; contribution: number }[],
  dataPoints: number,
): string {
  if (dataPoints < MIN_DATA_POINTS) {
    return `Données insuffisantes (${dataPoints} livraisons) pour une prédiction fiable. Importez davantage d'historique pour activer le modèle.`;
  }
  const driver = drivers[0]
    ? ` Principal facteur : ${DRIVER_LABELS[drivers[0].feature] ?? drivers[0].feature}.`
    : '';
  const ppmTxt =
    predictedPpm !== null
      ? ` PPM prévu ≈ ${predictedPpm} (risque de dépassement ${ppmBreach}%).`
      : '';
  return `Probabilité de retard sur la prochaine livraison : ${delayProb}% (retard attendu ≈ ${expectedDelay} j).${driver}${ppmTxt}`;
}

async function llmExplanation(
  supplierName: string,
  delayProb: number,
  expectedDelay: number,
  predictedPpm: number | null,
  ppmBreach: number,
  drivers: { feature: string; contribution: number }[],
  dataPoints: number,
): Promise<string | null> {
  const driverText = drivers
    .map((d) => `${DRIVER_LABELS[d.feature] ?? d.feature} (${d.contribution > 0 ? '+' : ''}${d.contribution})`)
    .join(', ');

  return openRouterComplete({
    system:
      "Tu es un analyste supply chain. Explique de façon concise, factuelle et professionnelle, en français. N'invente aucun chiffre : utilise uniquement ceux fournis.",
    user: `Fournisseur : ${supplierName}.
Modèle (régression logistique entraînée sur ${dataPoints} livraisons) :
- Probabilité de retard prochaine livraison : ${delayProb}%
- Retard attendu : ${expectedDelay} jours
- PPM prévu : ${predictedPpm ?? 'N/A'} (probabilité de dépassement du seuil : ${ppmBreach}%)
- Facteurs déterminants : ${driverText || 'n/a'}

Rédige 2 à 3 phrases d'explication, puis 1 recommandation d'action concrète. Pas de listes, pas de markdown.`,
    maxTokens: 280,
  });
}

/**
 * Entraîne le modèle sur l'historique du compte, prédit le risque opérationnel
 * d'un fournisseur, génère une explication (LLM ou repli) et persiste le tout.
 */
export async function predictOperationalRiskAction(
  supplierId: string,
): Promise<ActionResult<OperationalPrediction>> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };

  const demo = await denyIfDemo();
  if (demo) return demo;

  const accountId = auth.data.id;

  // Historique complet du compte → entraînement.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allRows, error } = await (client as any)
    .from('supplier_deliveries')
    .select('supplier_id, planned_date, delay_days, on_time, ppm, quantity')
    .eq('account_id', accountId);

  if (error) return { success: false, error: error.message };

  const rows = (allRows ?? []) as DeliveryRow[];
  const supplierRows = rows.filter((r) => r.supplier_id === supplierId);

  if (supplierRows.length === 0) {
    return {
      success: false,
      error: 'Aucune livraison enregistrée pour ce fournisseur. Importez son historique d’abord.',
    };
  }

  const model = trainDelayModel(rows);
  const delay = predictDelay(model, supplierRows);
  const ppm = forecastPpm(supplierRows);
  const riskLevel = operationalRiskLevel(delay.delayProbability, ppm.breachProbability);

  // Nom du fournisseur (pour l'explication).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: supplier } = await (client as any)
    .from('suppliers')
    .select('name')
    .eq('id', supplierId)
    .maybeSingle();
  const supplierName = supplier?.name ?? 'Fournisseur';

  const explanation =
    (await llmExplanation(
      supplierName,
      delay.delayProbability,
      delay.expectedDelayDays,
      ppm.predictedPpm,
      ppm.breachProbability,
      delay.topDrivers,
      delay.dataPoints,
    )) ??
    fallbackExplanation(
      delay.delayProbability,
      delay.expectedDelayDays,
      ppm.predictedPpm,
      ppm.breachProbability,
      delay.topDrivers,
      delay.dataPoints,
    );

  const generatedAt = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: upsertErr } = await (client as any)
    .from('delivery_predictions')
    .upsert(
      {
        account_id: accountId,
        supplier_id: supplierId,
        delay_probability: delay.delayProbability,
        expected_delay_days: delay.expectedDelayDays,
        predicted_ppm: ppm.predictedPpm,
        ppm_breach_probability: ppm.breachProbability,
        risk_level: riskLevel,
        confidence: delay.confidence,
        data_points: delay.dataPoints,
        features: {
          weights: model.weights,
          trained: model.trained,
          drivers: delay.topDrivers,
          ppm_trend: ppm.trendPerDelivery,
        },
        explanation,
        model_version: MODEL_VERSION,
        generated_at: generatedAt,
      },
      { onConflict: 'account_id,supplier_id' },
    );

  if (upsertErr) return { success: false, error: upsertErr.message };

  revalidatePath(`/home/suppliers/${supplierId}`);

  return {
    success: true,
    data: {
      supplier_id: supplierId,
      delay_probability: delay.delayProbability,
      expected_delay_days: delay.expectedDelayDays,
      predicted_ppm: ppm.predictedPpm,
      ppm_breach_probability: ppm.breachProbability,
      risk_level: riskLevel,
      confidence: delay.confidence,
      data_points: delay.dataPoints,
      explanation,
      model_version: MODEL_VERSION,
      generated_at: generatedAt,
    },
  };
}

/** Lecture de la prédiction stockée pour un fournisseur (server component). */
export async function getDeliveryPrediction(
  supplierId: string,
): Promise<OperationalPrediction | null> {
  const client = getSupabaseServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from('delivery_predictions')
    .select('*')
    .eq('supplier_id', supplierId)
    .maybeSingle();

  return (data as OperationalPrediction) ?? null;
}
