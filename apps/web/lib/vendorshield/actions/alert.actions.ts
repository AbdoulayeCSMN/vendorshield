'use server';

import { revalidatePath } from 'next/cache';

import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { z } from 'zod';

import { denyIfDemo } from '~/lib/vendorshield/demo';

type ActionResult<T = null> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string };

// ─── Acquitter une alerte ─────────────────────────────────────────────────────

export async function acknowledgeAlertAction(alertId: string): Promise<ActionResult> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };

  const demo = await denyIfDemo();
  if (demo) return demo;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client as any)
    .from('alerts')
    .update({
      status: 'acknowledged',
      acknowledged_by: auth.data.id,
      acknowledged_at: new Date().toISOString(),
    })
    .eq('id', alertId)
    .eq('status', 'open');

  if (error) return { success: false, error: error.message };

  revalidatePath('/home/alerts');
  revalidatePath('/home');
  return { success: true, data: null, message: 'Alerte acquittée' };
}

// ─── Résoudre une alerte ──────────────────────────────────────────────────────

const ResolveSchema = z.object({
  resolution_note: z.string().max(1000).optional(),
});

export async function resolveAlertAction(
  alertId: string,
  formData: FormData,
): Promise<ActionResult> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };

  const demo = await denyIfDemo();
  if (demo) return demo;

  const parsed = ResolveSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { success: false, error: 'Données invalides' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client as any)
    .from('alerts')
    .update({
      status: 'resolved',
      resolved_by: auth.data.id,
      resolved_at: new Date().toISOString(),
      resolution_note: parsed.data.resolution_note ?? null,
    })
    .eq('id', alertId)
    .in('status', ['open', 'acknowledged']);

  if (error) return { success: false, error: error.message };

  revalidatePath('/home/alerts');
  revalidatePath('/home');
  return { success: true, data: null, message: 'Alerte résolue' };
}

// ─── Ignorer une alerte ───────────────────────────────────────────────────────

export async function dismissAlertAction(alertId: string): Promise<ActionResult> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };

  const demo = await denyIfDemo();
  if (demo) return demo;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client as any)
    .from('alerts')
    .update({ status: 'dismissed' })
    .eq('id', alertId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/home/alerts');
  revalidatePath('/home');
  return { success: true, data: null };
}

// ─── Créer une alerte manuelle ────────────────────────────────────────────────

const ManualAlertSchema = z.object({
  supplier_id: z.string().uuid().optional().or(z.literal('')).transform((v) => v || null),
  title: z.string().min(3).max(255),
  message: z.string().min(3).max(1000),
  severity: z.enum(['info', 'warning', 'critical']).default('warning'),
});

export async function createManualAlertAction(
  _prevState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };

  const demo = await denyIfDemo();
  if (demo) return demo;

  const parsed = ManualAlertSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((i) => i.message).join(', ') };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from('alerts')
    .insert({
      ...parsed.data,
      account_id: auth.data.id,
      type: 'manual',
      status: 'open',
    })
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath('/home/alerts');
  revalidatePath('/home');
  return { success: true, data: { id: data.id } };
}

// ─── CRUD Règles d'alerte ─────────────────────────────────────────────────────

const AlertRuleSchema = z.object({
  name: z.string().min(2).max(255),
  description: z.string().max(500).optional(),
  dimension: z
    .enum(['financial', 'operational', 'geopolitical', 'esg'])
    .optional()
    .or(z.literal(''))
    .transform((v) => v || null),
  operator: z.enum(['<', '<=', '>', '>=']).default('<'),
  threshold: z.coerce.number().int().min(0).max(100),
  severity: z.enum(['info', 'warning', 'critical']).default('warning'),
  applies_to_category: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((v) => v || null),
  applies_to_criticality: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((v) => v || null),
  notify_email: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === 'on'),
  is_active: z
    .string()
    .optional()
    .transform((v) => v !== 'false'),
});

export async function createAlertRuleAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };

  const demo = await denyIfDemo();
  if (demo) return demo;

  const parsed = AlertRuleSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((i) => i.message).join(', ') };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from('alert_rules')
    .insert({ ...parsed.data, account_id: auth.data.id, created_by: auth.data.id })
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath('/home/alerts/rules');
  return { success: true, data: { id: data.id } };
}

export async function updateAlertRuleAction(
  ruleId: string,
  formData: FormData,
): Promise<ActionResult> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };

  const demo = await denyIfDemo();
  if (demo) return demo;

  const parsed = AlertRuleSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { success: false, error: 'Données invalides' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client as any)
    .from('alert_rules')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', ruleId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/home/alerts/rules');
  return { success: true, data: null, message: 'Règle mise à jour' };
}

export async function deleteAlertRuleAction(ruleId: string): Promise<ActionResult> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };

  const demo = await denyIfDemo();
  if (demo) return demo;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client as any).from('alert_rules').delete().eq('id', ruleId);
  if (error) return { success: false, error: error.message };

  revalidatePath('/home/alerts/rules');
  return { success: true, data: null };
}

export async function toggleAlertRuleAction(
  ruleId: string,
  isActive: boolean,
): Promise<ActionResult> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };

  const demo = await denyIfDemo();
  if (demo) return demo;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client as any)
    .from('alert_rules')
    .update({ is_active: isActive })
    .eq('id', ruleId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/home/alerts/rules');
  return { success: true, data: null };
}
