'use server';

import { revalidatePath } from 'next/cache';

import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { assertCanAddSuppliers, getBillingGate } from '~/lib/billing/gate.server';
import { denyIfDemo } from '~/lib/vendorshield/demo';
import { getServiceRoleClient } from '~/lib/vendorshield/service-client';

type ActionResult<T = null> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string };

export interface CommitImportInput {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: Record<string, any>[];
  columnMapping: Record<string, string>;
  filename: string;
  fileType?: string;
  qualityScore?: number;
}

export interface CommitImportResult {
  importId: string;
  imported: number;
  matched: number;
  unmatched: number;
}

const CANONICAL = {
  supplierId: 'supplier_id',
  plannedDate: 'date_prévue',
  actualDate: 'date_réelle',
  ppm: 'ppm_value',
  quantity: 'quantité',
  status: 'statut',
} as const;

/** Convertit ISO (YYYY-MM-DD) ou FR (DD/MM/YYYY) en 'YYYY-MM-DD', sinon null. */
function toISODate(value: unknown): string | null {
  if (!value) return null;
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const fr = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (fr) return `${fr[3]}-${fr[2]}-${fr[1]}`;
  return null;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function norm(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // diacritiques combinants
    .trim();
}

/**
 * Persiste les lignes validées dans supplier_deliveries (historique de
 * performance) et trace l'import dans data_imports. Rapproche chaque ligne d'un
 * fournisseur existant (par nom ou numéro d'enregistrement) quand c'est possible.
 */
// ─── Import de fiches FOURNISSEURS ────────────────────────────────────────────

const SUPPLIER_CATEGORIES = new Set([
  'raw_materials', 'components', 'logistics', 'services', 'technology',
  'energy', 'chemicals', 'packaging', 'maintenance', 'other',
]);
const SUPPLIER_CRITICALITIES = new Set(['critical', 'high', 'medium', 'low']);
const SUPPLIER_STATUSES = new Set([
  'active', 'under_review', 'suspended', 'inactive', 'blacklisted',
]);

function toInt(v: unknown): number | null {
  const n = toNumber(v);
  return n === null ? null : Math.round(n);
}
function toBool(v: unknown): boolean {
  const s = String(v ?? '').trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'oui' || s === 'vrai';
}
function clampScore(v: unknown): number | null {
  const n = toInt(v);
  return n === null ? null : Math.max(0, Math.min(100, n));
}

export interface CommitSupplierImportResult {
  importId: string | null;
  imported: number;
  skipped: number;
}

/**
 * Importe des FICHES FOURNISSEURS depuis un fichier mappé. La colonne `name`
 * est obligatoire ; le reste est optionnel (catégorie/criticité/statut validés
 * contre leurs enums, scores bornés 0-100). Écriture en service-role
 * (account_id dérivé du serveur ; suppliers.created_by → FK auth.users).
 */
export async function commitSupplierImportAction(
  input: CommitImportInput,
): Promise<ActionResult<CommitSupplierImportResult>> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };
  const demo = await denyIfDemo();
  if (demo) return demo;

  const accountId = auth.data.id;
  const svc = getServiceRoleClient();
  const rows = Array.isArray(input.rows) ? input.rows : [];
  if (rows.length === 0) return { success: false, error: 'Aucune ligne à importer.' };

  const map = (key: string) => input.columnMapping[key] || key;
  const val = (row: Record<string, unknown>, key: string) => row[map(key)];

  let skipped = 0;
  const suppliers: Record<string, unknown>[] = [];
  for (const row of rows) {
    const name = String(val(row, 'name') ?? '').trim();
    if (!name) {
      skipped++;
      continue;
    }
    const category = String(val(row, 'category') ?? '').trim().toLowerCase();
    const criticality = String(val(row, 'criticality') ?? '').trim().toLowerCase();
    const status = String(val(row, 'status') ?? '').trim().toLowerCase();

    suppliers.push({
      account_id: accountId,
      name,
      legal_name: String(val(row, 'legal_name') ?? '').trim() || null,
      registration_number: String(val(row, 'registration_number') ?? '').trim() || null,
      website: String(val(row, 'website') ?? '').trim() || null,
      country_code: String(val(row, 'country_code') ?? '').trim().toUpperCase().slice(0, 2) || null,
      country_name: String(val(row, 'country_name') ?? '').trim() || null,
      city: String(val(row, 'city') ?? '').trim() || null,
      category: SUPPLIER_CATEGORIES.has(category) ? category : 'other',
      criticality: SUPPLIER_CRITICALITIES.has(criticality) ? criticality : 'medium',
      status: SUPPLIER_STATUSES.has(status) ? status : 'active',
      annual_spend_eur: toInt(val(row, 'annual_spend_eur')),
      employee_count: toInt(val(row, 'employee_count')),
      founded_year: toInt(val(row, 'founded_year')),
      credit_rating: String(val(row, 'credit_rating') ?? '').trim() || null,
      is_sole_source: toBool(val(row, 'is_sole_source')),
      contract_start_date: toISODate(val(row, 'contract_start_date')),
      contract_end_date: toISODate(val(row, 'contract_end_date')),
      payment_terms_days: toInt(val(row, 'payment_terms_days')),
      global_score: clampScore(val(row, 'global_score')),
      financial_score: clampScore(val(row, 'financial_score')),
      operational_score: clampScore(val(row, 'operational_score')),
      geopolitical_score: clampScore(val(row, 'geopolitical_score')),
      esg_score: clampScore(val(row, 'esg_score')),
      created_by: accountId,
    });
  }

  if (suppliers.length === 0) {
    return { success: false, error: 'Aucune ligne valide (colonne « name » manquante ?).' };
  }

  const gate = await getBillingGate(accountId);
  const quotaError = assertCanAddSuppliers(gate, suppliers.length);
  if (quotaError) return quotaError;

  // Trace l'import.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: imp } = await (svc as any)
    .from('data_imports')
    .insert({
      account_id: accountId,
      filename: input.filename || 'suppliers',
      file_type: input.fileType || 'csv',
      total_rows: rows.length,
      valid_rows: suppliers.length,
      error_rows: skipped,
      import_status: 'processing',
      quality_score: input.qualityScore ?? 100,
      imported_by: accountId,
    })
    .select('id')
    .single();
  const importId = (imp?.id as string) ?? null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insErr } = await (svc as any).from('suppliers').insert(suppliers);
  if (insErr) {
    if (importId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (svc as any)
        .from('data_imports')
        .update({ import_status: 'failed', error_summary: insErr.message })
        .eq('id', importId);
    }
    return { success: false, error: insErr.message };
  }

  if (importId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (svc as any).from('data_imports').update({ import_status: 'done' }).eq('id', importId);
  }

  revalidatePath('/home/suppliers');
  revalidatePath('/home');
  return { success: true, data: { importId, imported: suppliers.length, skipped } };
}

export async function commitImportAction(
  input: CommitImportInput,
): Promise<ActionResult<CommitImportResult>> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };

  const demo = await denyIfDemo();
  if (demo) return demo;

  const accountId = auth.data.id;

  // Écritures via service-role : l'`account_id`/`imported_by` sont dérivés du
  // serveur (auth.data.id), et data_imports.imported_by est une FK vers
  // auth.users — qu'un client `authenticated` ne peut pas valider (erreur
  // « permission denied for table users »). Le service-role contourne ce point
  // et la RLS, sans risque puisque le compte est vérifié côté serveur.
  const svc = getServiceRoleClient();

  const rows = Array.isArray(input.rows) ? input.rows : [];
  if (rows.length === 0) {
    return { success: false, error: 'Aucune ligne à importer.' };
  }

  const map = (key: string) => input.columnMapping[key] || key;
  const get = (row: Record<string, unknown>, canonical: string) =>
    row[map(canonical)];

  // Table de rapprochement fournisseur (nom + numéro d'enregistrement).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: suppliers } = await (client as any)
    .from('suppliers')
    .select('id, name, registration_number')
    .eq('account_id', accountId);

  const byKey = new Map<string, string>();
  for (const s of suppliers ?? []) {
    if (s.name) byKey.set(norm(s.name), s.id);
    if (s.registration_number) byKey.set(norm(s.registration_number), s.id);
  }

  // Trace l'import (statut en cours).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: imp, error: impErr } = await (svc as any)
    .from('data_imports')
    .insert({
      account_id: accountId,
      filename: input.filename || 'import',
      file_type: input.fileType || 'csv',
      total_rows: rows.length,
      valid_rows: rows.length,
      error_rows: 0,
      import_status: 'processing',
      quality_score: input.qualityScore ?? 100,
      imported_by: accountId,
    })
    .select('id')
    .single();

  if (impErr) return { success: false, error: impErr.message };
  const importId = imp.id as string;

  let matched = 0;
  const deliveries = rows.map((row) => {
    const ref = get(row, CANONICAL.supplierId);
    const supplierId = ref ? byKey.get(norm(ref)) ?? null : null;
    if (supplierId) matched++;
    return {
      account_id: accountId,
      supplier_id: supplierId,
      supplier_ref: ref ? String(ref) : null,
      planned_date: toISODate(get(row, CANONICAL.plannedDate)),
      actual_date: toISODate(get(row, CANONICAL.actualDate)),
      ppm: toNumber(get(row, CANONICAL.ppm)),
      quantity: toNumber(get(row, CANONICAL.quantity)),
      status: get(row, CANONICAL.status) ? String(get(row, CANONICAL.status)) : null,
      import_id: importId,
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insErr } = await (svc as any)
    .from('supplier_deliveries')
    .insert(deliveries);

  if (insErr) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (svc as any)
      .from('data_imports')
      .update({ import_status: 'failed', error_summary: insErr.message })
      .eq('id', importId);
    return { success: false, error: insErr.message };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (svc as any)
    .from('data_imports')
    .update({ import_status: 'done' })
    .eq('id', importId);

  revalidatePath('/home/imports');
  revalidatePath('/home');

  return {
    success: true,
    data: {
      importId,
      imported: deliveries.length,
      matched,
      unmatched: deliveries.length - matched,
    },
    message: `${deliveries.length} lignes importées (${matched} rattachées à un fournisseur).`,
  };
}
