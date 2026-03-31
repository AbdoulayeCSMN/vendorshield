/**
 * VendorShield V2 — Edge Function : bankruptcy-predictor
 *
 * Algorithme :
 *   1. Récupérer les risk_factors financiers de la dernière évaluation
 *   2. Calculer le score Z adapté Altman (pondération sur 5 composantes)
 *   3. Calculer le trend de dégradation sur les évaluations historiques
 *   4. Dériver les probabilités par horizon (6/12/24 mois)
 *   5. Appel Groq pour l'interprétation narrative par horizon
 *   6. Persister dans bankruptcy_predictions
 *
 * Déclenchement :
 *   POST /functions/v1/bankruptcy-predictor
 *   Body: { supplier_id, account_id, triggered_by? }
 *
 * Variables requises :
 *   GROQ_API_KEY ou MOCK_AI=true
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface RiskFactor {
  factor_key:   string;
  score:        number;
  weight:       number;
  evidence:     string | null;
}

interface AssessmentHistory {
  assessment_date:  string;
  financial_score:  number | null;
  global_score:     number | null;
  status:           string;
}

interface KeyRiskFactor {
  factor:     string;
  impact:     'high' | 'medium' | 'low';
  mitigation: string;
}

interface PredictionResult {
  z_score:               number;
  risk_zone:             'safe' | 'grey' | 'distress';
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
  narrative_6m:          string;
  narrative_12m:         string;
  narrative_24m:         string;
  key_risk_factors:      KeyRiskFactor[];
  early_warning_signals: string[];
}

// ─── Calcul Z-Score adapté Altman ─────────────────────────────────────────────
//
// Score Z original Altman (1968) :
//   Z = 1.2*X1 + 1.4*X2 + 3.3*X3 + 0.6*X4 + 1.0*X5
//
// Notre adaptation (scores VendorShield 0-100 → normalisés 0-1) :
//   Z = 1.4*(credit/100) + 1.2*(100-debt_ratio)/100 + 0.8*(revenue/100)
//     + 0.6*(100-payment_delays)/100 + 1.0*(profitability/100)
//
// Seuils conservés : >2.6 safe | 1.1-2.6 grey | <1.1 distress

function computeZScore(factors: Map<string, number>, supplier: {
  financial_score: number | null;
  operational_score: number | null;
  geopolitical_score: number | null;
}): {
  z: number;
  components: Record<string, number | null>;
} {
  const get = (key: string): number | null => {
    const v = factors.get(key);
    return v !== undefined ? v : null;
  };

  const credit      = get('credit_rating');
  const debt        = get('debt_ratio');
  const revenue     = get('revenue_stability');
  const payments    = get('payment_delays');
  const profit      = get('profitability');
  const ops         = supplier.operational_score;
  const geo         = supplier.geopolitical_score;

  // Normalisation et inversion (certains scores sont "risque plus bas = meilleur")
  const w1 = credit  !== null ? (credit  / 100) * 1.4 : null;
  const w2 = debt    !== null ? ((100 - debt)  / 100) * 1.2 : null;  // dette inversée
  const w3 = revenue !== null ? (revenue / 100) * 0.8 : null;
  const w4 = payments !== null ? ((100 - payments) / 100) * 0.6 : null; // retards inversés
  const w5 = profit  !== null ? (profit  / 100) * 1.0 : null;
  const w6 = ops     !== null ? (ops     / 100) * 0.4 : null;
  const w7 = geo     !== null ? (geo     / 100) * 0.3 : null;

  // Pondération effective (normalise les composantes manquantes)
  const weights  = [1.4, 1.2, 0.8, 0.6, 1.0, 0.4, 0.3];
  const values   = [w1, w2, w3, w4, w5, w6, w7];
  const maxTotal = weights.reduce((a, b) => a + b, 0); // 5.7

  let scoreSum  = 0;
  let weightSum = 0;
  for (let i = 0; i < values.length; i++) {
    if (values[i] !== null) {
      scoreSum  += values[i]!;
      weightSum += weights[i]!;
    }
  }

  // Rescale sur base 5.7 pour maintenir les seuils d'Altman
  const z = weightSum > 0 ? (scoreSum / weightSum) * maxTotal : 2.0;

  return {
    z: Math.round(z * 1000) / 1000,
    components: {
      component_credit:       credit,
      component_debt:         debt,
      component_revenue:      revenue,
      component_payments:     payments,
      component_profitability: profit,
      component_operational:  ops,
      component_geopolitical: geo,
    },
  };
}

// ─── Calcul des probabilités par horizon ──────────────────────────────────────

function computeProbabilities(
  z: number,
  trend: number | null,
  isSOleSource: boolean,
  geopoliticalScore: number | null,
): { p6: number; p12: number; p24: number } {
  // Probabilité de base depuis Z-score (calibration empirique Altman)
  let base: number;
  if (z >= 3.0)      base = 2;
  else if (z >= 2.6) base = 5;
  else if (z >= 2.0) base = 12;
  else if (z >= 1.5) base = 22;
  else if (z >= 1.1) base = 38;
  else if (z >= 0.7) base = 58;
  else               base = 72;

  // Modificateurs
  let trendMod = 0;
  if (trend !== null) {
    if (trend < -15)      trendMod = 15;  // dégradation rapide
    else if (trend < -5) trendMod = 7;
    else if (trend > 10) trendMod = -5;  // amélioration
  }

  const ssMod  = isSOleSource ? 3 : 0;  // sole source = risque impact amplifié
  const geoMod = geopoliticalScore !== null && geopoliticalScore < 30 ? 8 : 0;

  const adj = base + trendMod + ssMod + geoMod;

  // Projection temporelle (dégradation non-linéaire)
  const p6  = Math.min(95, Math.max(1, Math.round(adj * 0.45)));
  const p12 = Math.min(95, Math.max(2, Math.round(adj * 0.75)));
  const p24 = Math.min(95, Math.max(3, Math.round(adj)));

  return { p6, p12, p24 };
}

// ─── Calcul du trend historique ────────────────────────────────────────────────

function computeTrend(history: AssessmentHistory[]): number | null {
  if (history.length < 2) return null;

  const sorted = [...history]
    .filter(h => h.financial_score !== null)
    .sort((a, b) => new Date(a.assessment_date).getTime() - new Date(b.assessment_date).getTime());

  if (sorted.length < 2) return null;

  const oldest = sorted[0].financial_score!;
  const latest = sorted[sorted.length - 1].financial_score!;
  return Math.round((latest - oldest) * 10) / 10;
}

// ─── Prompt LLM ───────────────────────────────────────────────────────────────

function buildLLMPrompt(supplier: Record<string, unknown>, zScore: number, zone: string,
  probs: { p6: number; p12: number; p24: number }, trend: number | null,
  factors: Map<string, number>, history: AssessmentHistory[]): string {

  const factorLines = Array.from(factors.entries())
    .map(([k, v]) => `  - ${k}: ${v}/100`)
    .join('\n');

  const historyLines = history.slice(0, 4)
    .map(h => `  ${h.assessment_date}: score financier ${h.financial_score ?? 'N/A'}/100`)
    .join('\n');

  return `Tu es un expert en analyse financière et gestion des risques fournisseurs.

FOURNISSEUR : ${supplier.name}
Pays : ${supplier.country_name ?? supplier.country_code}
Secteur : ${supplier.category}
Criticité : ${supplier.criticality}
Sole source : ${supplier.is_sole_source ? 'OUI ⚠️' : 'Non'}
Dépense annuelle : ${supplier.annual_spend_eur ? Number(supplier.annual_spend_eur).toLocaleString('fr-FR') + ' €' : 'N/A'}

SCORE Z ADAPTÉ ALTMAN : ${zScore} → Zone ${zone === 'safe' ? 'SÛRE ✅' : zone === 'grey' ? 'GRISE ⚠️' : 'DÉTRESSE ❌'}
Tendance score financier sur évaluations : ${trend !== null ? `${trend > 0 ? '+' : ''}${trend} points` : 'données insuffisantes'}

COMPOSANTES FINANCIÈRES :
${factorLines}

HISTORIQUE ÉVALUATIONS :
${historyLines || '  Aucune évaluation historique'}

PROBABILITÉS DE DÉFAUT CALCULÉES :
- 6 mois : ${probs.p6}%
- 12 mois : ${probs.p12}%
- 24 mois : ${probs.p24}%

Produis une analyse JSON valide uniquement, sans texte avant/après :
{
  "narrative_6m": "analyse factuelle horizon 6 mois (2-3 phrases, ton professionnel)",
  "narrative_12m": "analyse factuelle horizon 12 mois (2-3 phrases)",
  "narrative_24m": "analyse factuelle horizon 24 mois avec recommandations (3-4 phrases)",
  "key_risk_factors": [
    {"factor": "nom du risque", "impact": "high|medium|low", "mitigation": "action concrète recommandée"}
  ],
  "early_warning_signals": ["signal 1 à surveiller", "signal 2", "signal 3"]
}

Règles :
- Baser l'analyse sur les données fournies uniquement
- Ton factuel, pas alarmiste si zone sûre
- Max 5 key_risk_factors, max 4 early_warning_signals
- Répondre en français`;
}

// ─── Mode mock ────────────────────────────────────────────────────────────────

function generateMockNarratives(zone: string, probs: { p6: number; p12: number; p24: number }): {
  narrative_6m: string;
  narrative_12m: string;
  narrative_24m: string;
  key_risk_factors: KeyRiskFactor[];
  early_warning_signals: string[];
} {
  const isRisky = zone !== 'safe';

  return {
    narrative_6m: isRisky
      ? `Le score Z de ${zone === 'distress' ? 'détresse' : 'zone grise'} indique des tensions financières à court terme. Le risque de défaut à 6 mois est estimé à ${probs.p6}% sur base des indicateurs actuels. Une surveillance renforcée est recommandée.`
      : `Le profil financier est solide à court terme avec un risque de défaut à 6 mois limité à ${probs.p6}%. Les composantes financières sont dans des zones satisfaisantes sans signal d'alerte immédiat.`,

    narrative_12m: isRisky
      ? `Sur un horizon de 12 mois, le risque de défaut s'établit à ${probs.p12}%. La tendance de dégradation observée sur les évaluations historiques suggère une vigilance accrue sur la notation crédit et la stabilité du chiffre d'affaires.`
      : `À 12 mois, la probabilité de défaut reste contenue à ${probs.p12}%. Les fondamentaux demeurent robustes bien qu'une veille régulière sur les indicateurs financiers reste recommandée.`,

    narrative_24m: isRisky
      ? `L'horizon 24 mois présente un risque cumulé de ${probs.p24}%. Il est conseillé de prendre des mesures préventives : exiger des bilans trimestriels, qualifier des sources alternatives, et revoir les conditions de paiement. Une évaluation complète tous les 6 mois est préconisée.`
      : `Le profil à 24 mois reste favorable avec ${probs.p24}% de probabilité de défaut. Maintenir le rythme d'évaluations annuelles et surveiller les signaux précurseurs lors de chaque révision contractuelle.`,

    key_risk_factors: isRisky ? [
      { factor: 'Notation crédit dégradée', impact: 'high', mitigation: 'Demander bilan auditéet rapport agence notation' },
      { factor: 'Instabilité du CA', impact: 'medium', mitigation: 'Analyser diversification clients du fournisseur' },
      { factor: 'Niveau d\'endettement', impact: 'medium', mitigation: 'Surveiller ratio dette nette/EBITDA sur rapports trimestriels' },
    ] : [
      { factor: 'Concentration géographique', impact: 'low', mitigation: 'Maintenir la diversification des sources d\'approvisionnement' },
    ],

    early_warning_signals: isRisky
      ? ['Retards de paiement fournisseur > 30 jours', 'Changement de dirigeant ou de direction financière', 'Révision à la baisse de la notation crédit', 'Réduction significative du carnet de commandes annoncée']
      : ['Évolution du bilan annuel', 'Renouvellement des certifications qualité', 'Résultats des audits ESG'],
  };
}

// ─── Handler principal ────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  const supabaseUrl    = Deno.env.get('SUPABASE_URL')!;
  const serviceKey     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const groqKey        = Deno.env.get('GROQ_API_KEY') ?? '';
  const mockMode       = Deno.env.get('MOCK_AI') === 'true';

  const supabase = createClient(supabaseUrl, serviceKey);

  let body: { supplier_id: string; account_id: string; triggered_by?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Corps JSON invalide' }, { status: 400 });
  }

  const { supplier_id, account_id, triggered_by } = body;
  if (!supplier_id || !account_id) {
    return Response.json({ error: 'supplier_id et account_id requis' }, { status: 400 });
  }

  // ── 1. Récupérer le fournisseur ────────────────────────────────────────────

  const { data: supplier, error: sErr } = await supabase
    .from('suppliers')
    .select('id,name,category,criticality,country_code,country_name,is_sole_source,annual_spend_eur,financial_score,operational_score,geopolitical_score')
    .eq('id', supplier_id)
    .maybeSingle();

  if (sErr || !supplier) {
    return Response.json({ error: sErr?.message ?? 'Fournisseur introuvable' }, { status: 404 });
  }

  // ── 2. Récupérer les risk_factors financiers de la dernière évaluation ─────

  const { data: latestAssessment } = await supabase
    .from('risk_assessments')
    .select('id')
    .eq('supplier_id', supplier_id)
    .in('status', ['completed', 'approved'])
    .order('assessment_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const factorsMap = new Map<string, number>();

  if (latestAssessment?.id) {
    const { data: factors } = await supabase
      .from('risk_factors')
      .select('factor_key,score,weight,evidence')
      .eq('assessment_id', latestAssessment.id)
      .eq('dimension', 'financial');

    for (const f of (factors ?? []) as RiskFactor[]) {
      factorsMap.set(f.factor_key, f.score);
    }
  }

  // Fallback : utiliser financial_score global si pas de facteurs granulaires
  if (factorsMap.size === 0 && supplier.financial_score !== null) {
    const fs = supplier.financial_score;
    factorsMap.set('credit_rating',   Math.round(fs * 0.95));
    factorsMap.set('debt_ratio',      Math.round(100 - fs * 0.6));
    factorsMap.set('revenue_stability', Math.round(fs * 0.9));
    factorsMap.set('payment_delays',  Math.round(100 - fs * 0.5));
    factorsMap.set('profitability',   Math.round(fs * 0.85));
  }

  // ── 3. Historique des évaluations (trend) ─────────────────────────────────

  const { data: history } = await supabase
    .from('risk_assessments')
    .select('assessment_date,financial_score,global_score,status')
    .eq('supplier_id', supplier_id)
    .in('status', ['completed', 'approved'])
    .order('assessment_date', { ascending: false })
    .limit(6);

  const assessmentHistory = (history ?? []) as AssessmentHistory[];
  const trend             = computeTrend(assessmentHistory);

  // ── 4. Calcul Z-Score + probabilités ──────────────────────────────────────

  const { z, components } = computeZScore(factorsMap, supplier);
  const zone: 'safe' | 'grey' | 'distress' =
    z >= 2.6 ? 'safe' : z >= 1.1 ? 'grey' : 'distress';
  const probs = computeProbabilities(z, trend, supplier.is_sole_source, supplier.geopolitical_score);

  // ── 5. Interprétation LLM (Groq ou mock) ──────────────────────────────────

  let llmResult: ReturnType<typeof generateMockNarratives>;
  let promptTokens: number | null = null;
  let completionTokens: number | null = null;

  if (mockMode || !groqKey) {
    await new Promise(r => setTimeout(r, 400));
    llmResult = generateMockNarratives(zone, probs);
  } else {
    const prompt = buildLLMPrompt(supplier, z, zone, probs, trend, factorsMap, assessmentHistory);

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.25,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Tu es un expert en analyse financière. Réponds uniquement en JSON valide, sans texte autour.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      // Fallback mock si Groq échoue
      console.error('[bankruptcy-predictor] Groq error:', err);
      llmResult = generateMockNarratives(zone, probs);
    } else {
      const data = await res.json();
      promptTokens     = data.usage?.prompt_tokens ?? null;
      completionTokens = data.usage?.completion_tokens ?? null;
      try {
        llmResult = JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
      } catch {
        llmResult = generateMockNarratives(zone, probs);
      }
    }
  }

  // ── 6. Persister la prédiction ─────────────────────────────────────────────

  const { data: prediction, error: insertErr } = await supabase
    .from('bankruptcy_predictions')
    .insert({
      account_id,
      supplier_id,
      z_score:               z,
      risk_zone:             zone,
      ...components,
      probability_6m:        probs.p6,
      probability_12m:       probs.p12,
      probability_24m:       probs.p24,
      score_trend_3m:        trend,
      assessment_count:      assessmentHistory.length,
      narrative_6m:          llmResult.narrative_6m,
      narrative_12m:         llmResult.narrative_12m,
      narrative_24m:         llmResult.narrative_24m,
      key_risk_factors:      llmResult.key_risk_factors ?? [],
      early_warning_signals: llmResult.early_warning_signals ?? [],
      model_used:            mockMode ? 'mock' : 'llama-3.3-70b-versatile',
      prompt_tokens:         promptTokens,
      completion_tokens:     completionTokens,
      triggered_by:          triggered_by ?? null,
    })
    .select('id')
    .single();

  if (insertErr) {
    return Response.json({ error: insertErr.message }, { status: 500 });
  }

  return Response.json({
    success:          true,
    prediction_id:    prediction.id,
    z_score:          z,
    risk_zone:        zone,
    probability_6m:   probs.p6,
    probability_12m:  probs.p12,
    probability_24m:  probs.p24,
    mock_mode:        mockMode || !groqKey,
  });
});
