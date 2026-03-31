'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { z } from 'zod';

// ─── Schéma de validation ─────────────────────────────────────────────────────

const SupplierFormSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(255),
  legal_name: z.string().max(255).optional(),
  registration_number: z.string().max(100).optional(),
  vat_number: z.string().max(100).optional(),
  website: z
    .string()
    .url('URL invalide')
    .optional()
    .or(z.literal(''))
    .transform((v) => v || null),
  description: z.string().max(2000).optional(),

  category: z.enum([
    'raw_materials', 'components', 'logistics', 'services',
    'technology', 'energy', 'chemicals', 'packaging', 'maintenance', 'other',
  ]),
  status: z
    .enum(['active', 'under_review', 'suspended', 'inactive', 'blacklisted'])
    .default('active'),
  criticality: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),

  country_code: z.string().length(2).optional().or(z.literal('')).transform((v) => v || null),
  country_name: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  address: z.string().max(500).optional(),

  annual_spend_eur: z.coerce
    .number()
    .positive()
    .int()
    .optional()
    .nullable(),
  spend_percentage: z.coerce
    .number()
    .min(0)
    .max(100)
    .optional()
    .nullable(),
  is_sole_source: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === 'on'),
  payment_terms_days: z.coerce.number().positive().int().optional().nullable(),
  annual_revenue_eur: z.coerce.number().positive().int().optional().nullable(),
  employee_count: z.coerce.number().positive().int().optional().nullable(),

  notes: z.string().max(5000).optional(),
});

export type SupplierFormInput = z.infer<typeof SupplierFormSchema>;

// ─── Réponse standardisée ─────────────────────────────────────────────────────

type ActionResult<T = null> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

// ─── Créer un fournisseur ─────────────────────────────────────────────────────

// Signature useActionState : (prevState, formData)
export async function createSupplierAction(
  _prevState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const client = getSupabaseServerClient();
  const result = await requireUser(client);

  if (result.error) {
    return { success: false, error: 'Non authentifié' };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = SupplierFormSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      error: 'Données invalides',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from('suppliers')
    .insert({
      ...parsed.data,
      account_id: result.data.id,
      created_by: result.data.id,
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/home/suppliers');
  redirect(`/home/suppliers/${data.id}`);
}

// ─── Mettre à jour un fournisseur ─────────────────────────────────────────────

export async function updateSupplierAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const client = getSupabaseServerClient();
  const result = await requireUser(client);

  if (result.error) {
    return { success: false, error: 'Non authentifié' };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = SupplierFormSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      error: 'Données invalides',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client as any)
    .from('suppliers')
    .update({
      ...parsed.data,
      updated_by: result.data.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/home/suppliers/${id}`);
  revalidatePath('/home/suppliers');

  return { success: true, data: null, message: 'Fournisseur mis à jour' };
}

// ─── Supprimer un fournisseur ─────────────────────────────────────────────────

export async function deleteSupplierAction(id: string): Promise<ActionResult> {
  const client = getSupabaseServerClient();
  const result = await requireUser(client);

  if (result.error) {
    return { success: false, error: 'Non authentifié' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client as any)
    .from('suppliers')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/home/suppliers');
  redirect('/home/suppliers');
}

// ─── Changer le statut ────────────────────────────────────────────────────────

export async function updateSupplierStatusAction(
  id: string,
  status: string,
): Promise<ActionResult> {
  const client = getSupabaseServerClient();
  const result = await requireUser(client);

  if (result.error) {
    return { success: false, error: 'Non authentifié' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client as any)
    .from('suppliers')
    .update({ status, updated_by: result.data.id })
    .eq('id', id);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/home/suppliers/${id}`);
  revalidatePath('/home/suppliers');

  return { success: true, data: null };
}
