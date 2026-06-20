'use server';

import { revalidatePath } from 'next/cache';

import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

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
