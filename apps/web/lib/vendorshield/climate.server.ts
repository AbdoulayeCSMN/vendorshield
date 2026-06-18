import 'server-only';

/**
 * Évaluation du risque de disruption climatique par fournisseur, à partir des
 * prévisions Open-Meteo (gratuit, sans clé). On dérive un score de disruption
 * des aléas significatifs sur les 14 prochains jours : fortes pluies/inondation,
 * canicule, grand froid, tempête.
 */

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const FORECAST_DAYS = 14;

export interface ClimateHazard {
  type: 'flood' | 'heat' | 'cold' | 'storm';
  label: string;
  severity: 'moderate' | 'severe';
  peak: string; // ex: "62 mm le 21/06"
}

export interface ClimateAssessment {
  location: string;
  latitude: number;
  longitude: number;
  score: number; // 0-100
  level: 'low' | 'medium' | 'high' | 'critical';
  hazards: ClimateHazard[];
  horizon_days: number;
  generated_at: string;
}

async function timedFetch(url: string, ms = 7000): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal, cache: 'no-store' });
  } finally {
    clearTimeout(t);
  }
}

export async function geocode(
  city: string | null,
  country: string | null,
  countryCode: string | null,
): Promise<{ lat: number; lon: number; label: string } | null> {
  // On tente d'abord la ville (plus précis), puis le pays.
  const queries = [city, country].filter(Boolean) as string[];
  for (const q of queries) {
    try {
      const params = new URLSearchParams({ name: q, count: '1', language: 'fr', format: 'json' });
      if (countryCode) params.set('countryCode', countryCode);
      const res = await timedFetch(`${GEOCODE_URL}?${params.toString()}`);
      if (!res.ok) continue;
      const data = await res.json();
      const hit = data.results?.[0];
      if (hit) {
        return {
          lat: hit.latitude,
          lon: hit.longitude,
          label: [hit.name, hit.country].filter(Boolean).join(', '),
        };
      }
    } catch {
      // try next query
    }
  }
  return null;
}

// Seuils [modéré, sévère] par aléa.
const THRESHOLDS = {
  precip: [30, 60], // mm/jour
  heat: [35, 39], // °C max
  cold: [-10, -18], // °C min
  wind: [60, 80], // km/h max
};

function frDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function assessFromDaily(daily: {
  time: string[];
  precipitation_sum: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  wind_speed_10m_max: number[];
}): { score: number; level: ClimateAssessment['level']; hazards: ClimateHazard[] } {
  const hazards: ClimateHazard[] = [];

  const peakHigh = (arr: number[]) => {
    let idx = 0;
    for (let i = 1; i < arr.length; i++) if (arr[i]! > arr[idx]!) idx = i;
    return idx;
  };
  const peakLow = (arr: number[]) => {
    let idx = 0;
    for (let i = 1; i < arr.length; i++) if (arr[i]! < arr[idx]!) idx = i;
    return idx;
  };

  const addHigh = (
    type: ClimateHazard['type'],
    label: string,
    arr: number[],
    unit: string,
    [mod, sev]: number[],
  ) => {
    const i = peakHigh(arr);
    const v = arr[i]!;
    if (v >= sev!) hazards.push({ type, label, severity: 'severe', peak: `${Math.round(v)}${unit} le ${frDate(daily.time[i]!)}` });
    else if (v >= mod!) hazards.push({ type, label, severity: 'moderate', peak: `${Math.round(v)}${unit} le ${frDate(daily.time[i]!)}` });
  };

  addHigh('flood', 'Fortes précipitations', daily.precipitation_sum, ' mm', THRESHOLDS.precip);
  addHigh('heat', 'Canicule', daily.temperature_2m_max, '°C', THRESHOLDS.heat);
  addHigh('storm', 'Vents violents', daily.wind_speed_10m_max, ' km/h', THRESHOLDS.wind);

  // Froid extrême (seuils négatifs → on regarde le minimum).
  const ci = peakLow(daily.temperature_2m_min);
  const cv = daily.temperature_2m_min[ci]!;
  if (cv <= THRESHOLDS.cold[1]!) hazards.push({ type: 'cold', label: 'Grand froid', severity: 'severe', peak: `${Math.round(cv)}°C le ${frDate(daily.time[ci]!)}` });
  else if (cv <= THRESHOLDS.cold[0]!) hazards.push({ type: 'cold', label: 'Grand froid', severity: 'moderate', peak: `${Math.round(cv)}°C le ${frDate(daily.time[ci]!)}` });

  const score = Math.min(
    100,
    hazards.reduce((s, h) => s + (h.severity === 'severe' ? 35 : 15), 0),
  );
  const level =
    score >= 70 ? 'critical' : score >= 45 ? 'high' : score >= 25 ? 'medium' : 'low';
  return { score, level, hazards };
}

export async function assessClimate(
  city: string | null,
  country: string | null,
  countryCode: string | null,
): Promise<ClimateAssessment | null> {
  const geo = await geocode(city, country, countryCode);
  if (!geo) return null;

  const params = new URLSearchParams({
    latitude: String(geo.lat),
    longitude: String(geo.lon),
    daily:
      'precipitation_sum,temperature_2m_max,temperature_2m_min,wind_speed_10m_max',
    forecast_days: String(FORECAST_DAYS),
    timezone: 'auto',
  });

  const res = await timedFetch(`${FORECAST_URL}?${params.toString()}`);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.daily?.time) return null;

  const { score, level, hazards } = assessFromDaily(data.daily);
  return {
    location: geo.label,
    latitude: geo.lat,
    longitude: geo.lon,
    score,
    level,
    hazards,
    horizon_days: FORECAST_DAYS,
    generated_at: new Date().toISOString(),
  };
}
