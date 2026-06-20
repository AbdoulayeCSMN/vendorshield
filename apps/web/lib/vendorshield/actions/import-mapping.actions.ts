'use server';

import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { type ImportField, fieldsFor } from '~/lib/vendorshield/import-fields';

type MappingResult =
  | { success: true; mapping: Record<string, string>; source: 'llm' | 'auto' }
  | { success: false; error: string };

const SYNONYMS: Record<string, string[]> = {
  name: ['name', 'nom', 'fournisseur', 'supplier', 'raisonsociale', 'vendor'],
  registration_number: ['registration', 'siren', 'siret', 'immatriculation', 'numero', 'regno'],
  country_code: ['countrycode', 'codepays', 'iso', 'iso2'],
  country_name: ['country', 'pays'],
  city: ['city', 'ville'],
  category: ['category', 'categorie', 'famille', 'segment'],
  criticality: ['criticality', 'criticite', 'critique'],
  status: ['status', 'statut', 'etat'],
  annual_spend_eur: ['spend', 'depense', 'montant', 'amount', 'achats', 'turnover'],
  employee_count: ['employee', 'effectif', 'headcount', 'staff'],
  founded_year: ['founded', 'creation', 'annee', 'year'],
  credit_rating: ['rating', 'notation', 'credit'],
  is_sole_source: ['solesource', 'monosource', 'unique', 'single'],
  website: ['website', 'site', 'url', 'web'],
  global_score: ['globalscore', 'scoreglobal', 'score', 'note'],
  financial_score: ['financial', 'financier'],
  operational_score: ['operational', 'operationnel', 'ops'],
  geopolitical_score: ['geopolitical', 'geopolitique', 'geo'],
  esg_score: ['esg', 'rse'],
  supplier_id: ['supplierid', 'fournisseur', 'supplier', 'vendor'],
  'date_prévue': ['planned', 'prevue', 'expected', 'planneddate'],
  'date_réelle': ['actual', 'reelle', 'received', 'livraison', 'delivery'],
  ppm_value: ['ppm', 'defaut', 'defect', 'quality'],
  'quantité': ['quantity', 'quantite', 'qty', 'volume'],
  'statut': ['status', 'statut', 'state'],
};

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/** Correspondance déterministe (repli si le LLM est indisponible). */
function deterministicMap(headers: string[], fields: ImportField[]): Record<string, string> {
  const map: Record<string, string> = {};
  const used = new Set<string>();
  for (const f of fields) {
    const cands = SYNONYMS[f.key] ?? [norm(f.key)];
    const h = headers.find(
      (hh) => !used.has(hh) && cands.some((c) => norm(hh).includes(c) || c.includes(norm(hh))),
    );
    if (h) {
      map[f.key] = h;
      used.add(h);
    }
  }
  return map;
}

async function llmMap(system: string, user: string): Promise<string | null> {
  const body = (model: string) =>
    JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 700,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });

  const call = async (url: string, key: string, model: string) => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: body(model),
      });
      if (!res.ok) return null;
      const d = await res.json();
      return (d.choices?.[0]?.message?.content as string) ?? null;
    } catch {
      return null;
    }
  };

  const groq = process.env.GROQ_API_KEY;
  if (groq) {
    const r = await call('https://api.groq.com/openai/v1/chat/completions', groq, 'llama-3.3-70b-versatile');
    if (r) return r;
  }
  const or = process.env.OPENROUTER_API_KEY;
  if (or) {
    const r = await call('https://openrouter.ai/api/v1/chat/completions', or, 'google/gemma-4-31b-it:free');
    if (r) return r;
  }
  return null;
}

export async function suggestColumnMappingAction(input: {
  headers: string[];
  sampleRows: Record<string, unknown>[];
  importType: 'suppliers' | 'deliveries';
}): Promise<MappingResult> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };

  const headers = (input.headers ?? []).filter((h) => h && h !== 'row_number');
  if (headers.length === 0) return { success: false, error: 'Aucune colonne détectée.' };

  const fields = fieldsFor(input.importType);
  const fallback = deterministicMap(headers, fields);

  const sampleLines = headers
    .map((h) => {
      const ex = input.sampleRows
        .map((r) => r[h])
        .filter((v) => v !== undefined && v !== null && v !== '')
        .slice(0, 2)
        .join(' | ');
      return `- "${h}"${ex ? ` (ex: ${ex})` : ''}`;
    })
    .join('\n');

  const targetLines = fields
    .map((f) => `- ${f.key}: ${f.label}${f.hint ? ` [${f.hint}]` : ''}`)
    .join('\n');

  const raw = await llmMap(
    'Tu associes les colonnes d’un fichier à des champs cibles. Réponds UNIQUEMENT par un objet JSON, sans texte.',
    `Colonnes du fichier :\n${sampleLines}\n\nChamps cibles :\n${targetLines}\n\nPour chaque champ cible, donne le NOM EXACT de la colonne source la plus probable, ou null si aucune ne correspond. Réponds un objet JSON de la forme {"champ_cible": "colonne_source" | null}.`,
  );

  if (!raw) return { success: true, mapping: fallback, source: 'auto' };

  try {
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? raw) as Record<string, unknown>;
    const mapping: Record<string, string> = {};
    for (const f of fields) {
      const src = parsed[f.key];
      if (typeof src === 'string' && headers.includes(src)) mapping[f.key] = src;
      else if (fallback[f.key]) mapping[f.key] = fallback[f.key]!;
    }
    return { success: true, mapping, source: 'llm' };
  } catch {
    return { success: true, mapping: fallback, source: 'auto' };
  }
}
