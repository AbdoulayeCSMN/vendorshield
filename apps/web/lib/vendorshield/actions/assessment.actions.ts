'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { z } from 'zod';

type ActionResult<T = null> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string };

// ─── 1. Créer une évaluation (draft) + seeder les 24 facteurs ────────────────

const CreateAssessmentSchema = z.object({
  supplier_id: z.string().uuid('Fournisseur invalide'),
  title: z.string().min(3).max(255),
  assessment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  next_review_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal(''))
    .transform((v) => v || null),
  weight_financial: z.coerce.number().int().min(0).max(100).default(30),
  weight_operational: z.coerce.number().int().min(0).max(100).default(30),
  weight_geopolitical: z.coerce.number().int().min(0).max(100).default(20),
  weight_esg: z.coerce.number().int().min(0).max(100).default(20),
});

export async function createAssessmentAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };

  const parsed = CreateAssessmentSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(', '),
    };
  }

  const { weight_financial, weight_operational, weight_geopolitical, weight_esg } =
    parsed.data;
  if (weight_financial + weight_operational + weight_geopolitical + weight_esg !== 100) {
    return { success: false, error: 'Les pondérations doivent totaliser 100%' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from('risk_assessments')
    .insert({
      ...parsed.data,
      account_id: auth.data.id,
      created_by: auth.data.id,
      status: 'draft',
      version: 1,
    })
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };

  // Appeler la fonction SQL pour seeder les 24 facteurs par défaut
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: seedError } = await (client as any).rpc('seed_default_risk_factors', {
    p_assessment_id: data.id,
    p_account_id: auth.data.id,
  });

  if (seedError) {
    // Supprimer l'évaluation si le seed échoue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client as any).from('risk_assessments').delete().eq('id', data.id);
    return { success: false, error: seedError.message };
  }

  // Passer en in_progress
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (client as any)
    .from('risk_assessments')
    .update({ status: 'in_progress' })
    .eq('id', data.id);

  revalidatePath('/home/risk-assessments');
  return { success: true, data: { id: data.id } };
}

// ─── 2. Sauvegarder les scores d'une dimension ───────────────────────────────

const FactorScoreSchema = z.object({
  factor_id: z.string().uuid(),
  score: z.coerce.number().int().min(0).max(100),
  evidence: z.string().max(2000).optional(),
});

export async function updateFactorScoresAction(
  assessmentId: string,
  factors: { factor_id: string; score: number; evidence?: string }[],
): Promise<ActionResult> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };

  // Valider chaque facteur
  for (const f of factors) {
    const result = FactorScoreSchema.safeParse(f);
    if (!result.success) {
      return { success: false, error: `Score invalide pour le facteur ${f.factor_id}` };
    }
  }

  // Update individuel par id — les facteurs existent déjà (créés par seed_default_risk_factors).
  // On n'utilise pas upsert car la politique RLS INSERT exige account_id dans le payload,
  // alors que UPDATE filtre par la colonne id qui suffit à identifier la ligne.
  for (const f of factors) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (client as any)
      .from('risk_factors')
      .update({
        score:      f.score,
        evidence:   f.evidence ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', f.factor_id);

    if (error) return { success: false, error: error.message };
  }

  return { success: true, data: null };
}

// ─── 3. Calculer les scores (appel SQL) ──────────────────────────────────────

export async function computeAssessmentScoresAction(
  assessmentId: string,
): Promise<ActionResult<{ global_score: number }>> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client as any).rpc('compute_assessment_scores', {
    p_assessment_id: assessmentId,
  });

  if (error) return { success: false, error: error.message };

  // Récupérer le score calculé
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from('risk_assessments')
    .select('global_score')
    .eq('id', assessmentId)
    .single();

  revalidatePath(`/home/risk-assessments/${assessmentId}`);

  return {
    success: true,
    data: { global_score: data?.global_score ?? 0 },
  };
}

// ─── 4. Finaliser une évaluation ─────────────────────────────────────────────

const FinalizeSchema = z.object({
  analyst_notes: z.string().max(5000).optional(),
  executive_summary: z.string().max(2000).optional(),
  mitigation_plan: z.string().max(5000).optional(),
  next_review_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal(''))
    .transform((v) => v || null),
});

export async function finalizeAssessmentAction(
  assessmentId: string,
  formData: FormData,
): Promise<ActionResult> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };

  const parsed = FinalizeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { success: false, error: 'Données invalides' };
  }

  // Recalculer les scores avant de finaliser
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (client as any).rpc('compute_assessment_scores', {
    p_assessment_id: assessmentId,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client as any)
    .from('risk_assessments')
    .update({
      ...parsed.data,
      status: 'completed',
      updated_by: auth.data.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assessmentId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/home/risk-assessments/${assessmentId}`);
  revalidatePath('/home/risk-assessments');
  revalidatePath('/home');

  redirect(`/home/risk-assessments/${assessmentId}`);
}

// ─── 5. Approuver une évaluation ─────────────────────────────────────────────

export async function approveAssessmentAction(
  assessmentId: string,
): Promise<ActionResult> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client as any)
    .from('risk_assessments')
    .update({
      status: 'approved',
      approved_by: auth.data.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', assessmentId)
    .eq('status', 'completed'); // Seulement depuis completed

  if (error) return { success: false, error: error.message };

  revalidatePath(`/home/risk-assessments/${assessmentId}`);
  revalidatePath('/home/risk-assessments');
  revalidatePath('/home');

  return { success: true, data: null, message: 'Évaluation approuvée' };
}

// ─── 6. Archiver ─────────────────────────────────────────────────────────────

export async function archiveAssessmentAction(
  assessmentId: string,
): Promise<ActionResult> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client as any)
    .from('risk_assessments')
    .update({ status: 'archived' })
    .eq('id', assessmentId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/home/risk-assessments');
  redirect('/home/risk-assessments');
}
