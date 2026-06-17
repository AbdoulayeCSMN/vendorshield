/**
 * Moteur de prédiction opérationnelle — modèles ML légers entraînés en TS.
 *
 * Principe : chiffres déterministes & auditables (pas de boîte noire). Le LLM
 * n'intervient QUE pour l'explication, jamais pour produire les probabilités.
 *
 * - Retard de livraison : régression logistique entraînée par descente de
 *   gradient sur l'historique du compte. Features calculées en fenêtre
 *   expansive (uniquement le passé du fournisseur) → pas de fuite temporelle.
 * - Défauts/qualité : régression linéaire (moindres carrés) sur la série PPM.
 */

export const MODEL_VERSION = 'delay-logreg-v1';

// Seuil minimal de données pour produire une prédiction fiable.
export const MIN_DATA_POINTS = 8;

export interface DeliveryRow {
  supplier_id: string | null;
  planned_date: string | null;
  delay_days: number | null;
  on_time: boolean | null;
  ppm: number | null;
  quantity: number | null;
}

const FEATURE_NAMES = [
  'biais',
  'otd_anterieur',
  'retard_moyen_anterieur',
  'quantite',
  'ppm',
  'saison_sin',
  'saison_cos',
] as const;

type FeatureVector = number[]; // longueur = FEATURE_NAMES.length

interface TrainingSample {
  supplierId: string;
  time: number;
  x: FeatureVector;
  y: number; // 1 = en retard
}

// ─── Feature engineering (fenêtre expansive, sans fuite) ─────────────────────

function monthSeasonality(dateStr: string): [number, number] {
  const m = new Date(dateStr).getMonth(); // 0-11
  const angle = (2 * Math.PI * m) / 12;
  return [Math.sin(angle), Math.cos(angle)];
}

/**
 * Construit les échantillons d'entraînement : pour chaque livraison datée et
 * étiquetée, les features n'utilisent QUE les livraisons antérieures du même
 * fournisseur (running stats).
 */
function buildSamples(rows: DeliveryRow[]): TrainingSample[] {
  const dated = rows
    .filter((r) => r.planned_date && r.supplier_id && r.on_time !== null)
    .map((r) => ({ ...r, time: new Date(r.planned_date as string).getTime() }))
    .sort((a, b) => a.time - b.time);

  const running: Record<string, { n: number; late: number; delaySum: number }> = {};
  const samples: TrainingSample[] = [];

  for (const r of dated) {
    const sid = r.supplier_id as string;
    const acc = (running[sid] ??= { n: 0, late: 0, delaySum: 0 });

    // Features basées sur le passé uniquement.
    const priorOtd = acc.n > 0 ? 1 - acc.late / acc.n : 0.85; // a priori optimiste
    const priorAvgDelay = acc.n > 0 ? acc.delaySum / acc.n : 0;
    const [sin, cos] = monthSeasonality(r.planned_date as string);

    samples.push({
      supplierId: sid,
      time: r.time,
      x: [
        1,
        priorOtd,
        priorAvgDelay,
        r.quantity ?? 0,
        r.ppm ?? 0,
        sin,
        cos,
      ],
      y: r.on_time ? 0 : 1,
    });

    // Mise à jour des stats courantes APRÈS avoir produit l'échantillon.
    acc.n += 1;
    if (!r.on_time) acc.late += 1;
    acc.delaySum += Math.max(0, r.delay_days ?? 0);
  }

  return samples;
}

// ─── Standardisation ─────────────────────────────────────────────────────────

interface Scaler {
  mean: number[];
  std: number[];
}

function fitScaler(samples: TrainingSample[]): Scaler {
  const d = FEATURE_NAMES.length;
  const mean = new Array(d).fill(0);
  const std = new Array(d).fill(1);
  if (samples.length === 0) return { mean, std };

  for (const s of samples) for (let j = 0; j < d; j++) mean[j] += s.x[j]!;
  for (let j = 0; j < d; j++) mean[j] /= samples.length;

  const varc = new Array(d).fill(0);
  for (const s of samples)
    for (let j = 0; j < d; j++) varc[j] += (s.x[j]! - mean[j]!) ** 2;
  for (let j = 0; j < d; j++) {
    std[j] = Math.sqrt(varc[j] / samples.length) || 1;
  }
  // On ne standardise jamais le biais (indice 0).
  mean[0] = 0;
  std[0] = 1;
  return { mean, std };
}

function scale(x: FeatureVector, sc: Scaler): FeatureVector {
  return x.map((v, j) => (v - sc.mean[j]!) / sc.std[j]!);
}

// ─── Régression logistique (descente de gradient + L2) ───────────────────────

function sigmoid(z: number): number {
  if (z < -30) return 1e-13;
  if (z > 30) return 1 - 1e-13;
  return 1 / (1 + Math.exp(-z));
}

export interface DelayModel {
  weights: number[];
  scaler: Scaler;
  trained: boolean;
  dataPoints: number;
}

export function trainDelayModel(rows: DeliveryRow[]): DelayModel {
  const samples = buildSamples(rows);
  const d = FEATURE_NAMES.length;

  if (samples.length < MIN_DATA_POINTS) {
    return { weights: new Array(d).fill(0), scaler: fitScaler(samples), trained: false, dataPoints: samples.length };
  }

  const scaler = fitScaler(samples);
  const X = samples.map((s) => scale(s.x, scaler));
  const y = samples.map((s) => s.y);

  const w = new Array(d).fill(0);
  const lr = 0.3;
  const l2 = 1e-3;
  const epochs = 400;
  const n = samples.length;

  for (let epoch = 0; epoch < epochs; epoch++) {
    const grad = new Array(d).fill(0);
    for (let i = 0; i < n; i++) {
      let z = 0;
      for (let j = 0; j < d; j++) z += w[j] * X[i]![j]!;
      const err = sigmoid(z) - y[i]!;
      for (let j = 0; j < d; j++) grad[j] += err * X[i]![j]!;
    }
    for (let j = 0; j < d; j++) {
      const reg = j === 0 ? 0 : l2 * w[j]; // pas de régularisation sur le biais
      w[j] -= lr * (grad[j] / n + reg);
    }
  }

  return { weights: w, scaler, trained: true, dataPoints: samples.length };
}

/** Features « actuelles » d'un fournisseur (toute son histoire) pour la prévision. */
function currentFeatures(rows: DeliveryRow[]): FeatureVector {
  const labelled = rows.filter((r) => r.on_time !== null);
  const n = labelled.length;
  const late = labelled.filter((r) => r.on_time === false).length;
  const otd = n > 0 ? 1 - late / n : 0.85;
  const delaySum = labelled.reduce((a, r) => a + Math.max(0, r.delay_days ?? 0), 0);
  const avgDelay = n > 0 ? delaySum / n : 0;
  const qtys = rows.map((r) => r.quantity ?? 0).filter((q) => q > 0);
  const avgQty = qtys.length ? qtys.reduce((a, b) => a + b, 0) / qtys.length : 0;
  const ppms = rows.map((r) => r.ppm ?? 0).filter((p) => p > 0);
  const avgPpm = ppms.length ? ppms.reduce((a, b) => a + b, 0) / ppms.length : 0;
  const [sin, cos] = monthSeasonality(new Date().toISOString());
  return [1, otd, avgDelay, avgQty, avgPpm, sin, cos];
}

export interface DelayPrediction {
  delayProbability: number; // 0-100
  expectedDelayDays: number;
  dataPoints: number;
  confidence: number; // 0-100
  topDrivers: { feature: string; contribution: number }[];
}

export function predictDelay(model: DelayModel, supplierRows: DeliveryRow[]): DelayPrediction {
  const labelled = supplierRows.filter((r) => r.on_time !== null);
  const x = currentFeatures(supplierRows);

  let probability: number;
  if (model.trained) {
    const xs = scale(x, model.scaler);
    let z = 0;
    for (let j = 0; j < model.weights.length; j++) z += model.weights[j]! * xs[j]!;
    probability = sigmoid(z);
  } else {
    // Repli empirique : taux de retard observé.
    const late = labelled.filter((r) => r.on_time === false).length;
    probability = labelled.length ? late / labelled.length : 0.15;
  }

  // Retard attendu = moyenne des retards positifs observés, pondérée par la proba.
  const positiveDelays = supplierRows
    .map((r) => r.delay_days ?? 0)
    .filter((d) => d > 0);
  const avgPositiveDelay = positiveDelays.length
    ? positiveDelays.reduce((a, b) => a + b, 0) / positiveDelays.length
    : 0;

  // Contributions (poids × feature standardisée) pour l'explicabilité.
  const drivers = model.trained
    ? scale(x, model.scaler)
        .map((v, j) => ({ feature: FEATURE_NAMES[j]!, contribution: model.weights[j]! * v }))
        .filter((d) => d.feature !== 'biais')
        .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
        .slice(0, 3)
    : [];

  const dataPoints = labelled.length;
  const confidence = Math.min(100, Math.round((dataPoints / 30) * 100));

  return {
    delayProbability: Math.round(probability * 1000) / 10,
    expectedDelayDays: Math.round(avgPositiveDelay * probability * 10) / 10,
    dataPoints,
    confidence,
    topDrivers: drivers.map((d) => ({
      feature: d.feature,
      contribution: Math.round(d.contribution * 1000) / 1000,
    })),
  };
}

// ─── Prévision PPM (régression linéaire moindres carrés) ─────────────────────

export interface PpmForecast {
  predictedPpm: number | null;
  trendPerDelivery: number; // pente
  breachProbability: number; // 0-100, dépassement du seuil
  dataPoints: number;
}

export function forecastPpm(supplierRows: DeliveryRow[], threshold = 5000): PpmForecast {
  const series = supplierRows
    .filter((r) => r.ppm !== null && r.planned_date)
    .map((r) => ({ t: new Date(r.planned_date as string).getTime(), ppm: r.ppm as number }))
    .sort((a, b) => a.t - b.t);

  if (series.length < 3) {
    const last = series.at(-1)?.ppm ?? null;
    return {
      predictedPpm: last,
      trendPerDelivery: 0,
      breachProbability: last !== null && last > threshold ? 80 : 10,
      dataPoints: series.length,
    };
  }

  // Régression linéaire sur l'index (proxy du temps).
  const n = series.length;
  const xs = series.map((_, i) => i);
  const ys = series.map((s) => s.ppm);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i]! - meanX) * (ys[i]! - meanY);
    den += (xs[i]! - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;
  const predicted = Math.max(0, intercept + slope * n); // prochaine livraison

  // Écart-type des résidus → probabilité de dépassement (approx. normale).
  let ss = 0;
  for (let i = 0; i < n; i++) {
    const fit = intercept + slope * xs[i]!;
    ss += (ys[i]! - fit) ** 2;
  }
  const resStd = Math.sqrt(ss / Math.max(1, n - 2)) || 1;
  const zBreach = (predicted - threshold) / resStd;
  const breachProbability = Math.round(sigmoid(zBreach * 1.7) * 100);

  return {
    predictedPpm: Math.round(predicted),
    trendPerDelivery: Math.round(slope * 10) / 10,
    breachProbability,
    dataPoints: n,
  };
}

// ─── Synthèse risque opérationnel ────────────────────────────────────────────

export function operationalRiskLevel(
  delayProb: number,
  ppmBreachProb: number,
): 'low' | 'medium' | 'high' | 'critical' {
  const score = Math.max(delayProb, ppmBreachProb);
  if (score >= 70) return 'critical';
  if (score >= 45) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}
