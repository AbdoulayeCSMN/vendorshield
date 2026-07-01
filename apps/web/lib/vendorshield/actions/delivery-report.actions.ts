'use server';

import { randomBytes } from 'crypto';
import { revalidatePath } from 'next/cache';

import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { denyIfDemo } from '~/lib/vendorshield/demo';
import { getServiceRoleClient } from '~/lib/vendorshield/service-client';

type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DeliveryReportRequest {
  id: string;
  supplier_id: string;
  supplier_name: string;
  token: string;
  status: 'pending' | 'submitted' | 'expired';
  period_label: string | null;
  order_ref: string | null;
  expires_at: string;
  submitted_at: string | null;
  created_at: string;
}

export interface PublicDeliveryRequest {
  supplierName: string;
  periodLabel: string | null;
  orderRef: string | null;
  supplierId: string;
  status: 'pending' | 'submitted' | 'expired';
}

export interface DeliveryReportInput {
  order_ref?: string;
  planned_date: string;
  actual_date: string;
  quantity: number;
  unit: string;
  defects?: number | null;
  ppm?: number | null;
  status: string;
  notes?: string;
}

// ─── In-app : création du lien ────────────────────────────────────────────────

export async function createDeliveryReportRequestAction(
  supplierId: string,
  periodLabel?: string,
  orderRef?: string,
): Promise<ActionResult<{ token: string }>> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };

  const demo = await denyIfDemo();
  if (demo) return demo;

  const accountId = auth.data.id;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: supplier } = await (client as any)
    .from('suppliers')
    .select('id, name')
    .eq('id', supplierId)
    .eq('account_id', accountId)
    .maybeSingle();

  if (!supplier) return { success: false, error: 'Fournisseur introuvable.' };

  const token = randomBytes(24).toString('hex');
  const svc = getServiceRoleClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (svc as any)
    .from('delivery_report_requests')
    .insert({
      account_id:    accountId,
      supplier_id:   supplierId,
      supplier_name: supplier.name,
      token,
      period_label:  periodLabel ?? null,
      order_ref:     orderRef ?? null,
    });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/home/suppliers/${supplierId}`);
  return { success: true, data: { token } };
}

// ─── In-app : liste des demandes d'un fournisseur ────────────────────────────

export async function getSupplierDeliveryReports(
  supplierId: string,
): Promise<DeliveryReportRequest[]> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from('delivery_report_requests')
    .select('*')
    .eq('account_id', auth.data.id)
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false });

  return (data ?? []) as DeliveryReportRequest[];
}

// ─── Public (portail fournisseur, autorisé par token) ────────────────────────

export async function getDeliveryRequestByToken(
  token: string,
): Promise<PublicDeliveryRequest | null> {
  if (!/^[a-f0-9]{48}$/i.test(token)) return null;

  const svc = getServiceRoleClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (svc as any)
    .from('delivery_report_requests')
    .select('supplier_name, period_label, order_ref, supplier_id, status, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (!data) return null;

  const isExpired =
    data.status === 'expired' ||
    new Date(data.expires_at) < new Date();

  return {
    supplierName: data.supplier_name,
    periodLabel:  data.period_label ?? null,
    orderRef:     data.order_ref ?? null,
    supplierId:   data.supplier_id,
    status:       isExpired ? 'expired' : (data.status as 'pending' | 'submitted'),
  };
}

// ─── Public : soumission du rapport de livraison ──────────────────────────────

export async function submitDeliveryReportAction(
  token: string,
  input: DeliveryReportInput,
): Promise<ActionResult<null>> {
  if (!/^[a-f0-9]{48}$/i.test(token))
    return { success: false, error: 'Lien invalide.' };

  const svc = getServiceRoleClient();

  // Vérifie que le token existe et est toujours actif.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: req } = await (svc as any)
    .from('delivery_report_requests')
    .select('id, account_id, supplier_id, status, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (!req) return { success: false, error: 'Lien introuvable.' };
  if (req.status === 'submitted') return { success: false, error: 'Déjà soumis.' };
  if (req.status === 'expired' || new Date(req.expires_at) < new Date())
    return { success: false, error: 'Lien expiré.' };

  // Calcule le PPM si l'utilisateur a fourni un nombre de défauts brut.
  let ppm = input.ppm ?? null;
  if (ppm === null && input.defects != null && input.quantity > 0) {
    ppm = Math.round((input.defects / input.quantity) * 1_000_000);
  }

  // Enregistre dans supplier_deliveries (alimente les prédictions ML).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insErr } = await (svc as any)
    .from('supplier_deliveries')
    .insert({
      account_id:   req.account_id,
      supplier_id:  req.supplier_id,
      supplier_ref: input.order_ref ?? null,
      planned_date: input.planned_date,
      actual_date:  input.actual_date,
      ppm,
      quantity:     input.quantity,
      status:       input.status,
    });

  if (insErr) return { success: false, error: insErr.message };

  // Marque la demande comme soumise.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (svc as any)
    .from('delivery_report_requests')
    .update({ status: 'submitted', submitted_at: new Date().toISOString() })
    .eq('id', req.id);

  return { success: true, data: null };
}
