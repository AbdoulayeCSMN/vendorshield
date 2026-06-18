import 'server-only';

/**
 * Client du service ML Python (FastAPI). Robuste par conception : si le service
 * n'est pas configuré ou injoignable, on renvoie `null` et l'appelant bascule
 * sur le modèle TS embarqué — l'app ne casse jamais.
 */

export interface MlDriver {
  feature: string;
  importance: number;
}

export interface MlSupplierPrediction {
  supplier_id: string;
  delay_probability: number;
  expected_delay_days: number;
  predicted_ppm: number | null;
  ppm_breach_probability: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  data_points: number;
  drivers: MlDriver[];
}

export interface MlPredictResponse {
  model_version: string;
  predictions: MlSupplierPrediction[];
  drift?: { status: string; max_psi: number; drifted_features: string[] } | null;
}

export interface MlDeliveryInput {
  supplier_id: string;
  planned_date: string | null;
  actual_date: string | null;
  ppm: number | null;
  quantity: number | null;
}

export async function predictViaMlService(
  deliveries: MlDeliveryInput[],
): Promise<MlPredictResponse | null> {
  const baseUrl = process.env.ML_SERVICE_URL;
  if (!baseUrl) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.ML_SERVICE_API_KEY
          ? { 'X-API-Key': process.env.ML_SERVICE_API_KEY }
          : {}),
      },
      body: JSON.stringify({ deliveries }),
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('[ml-service] HTTP', res.status, await res.text().catch(() => ''));
      return null;
    }
    return (await res.json()) as MlPredictResponse;
  } catch (error) {
    console.error('[ml-service] unreachable, falling back to TS model:', error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
