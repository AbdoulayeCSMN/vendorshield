'use server';

import { randomBytes } from 'node:crypto';

import { revalidatePath } from 'next/cache';

import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { denyIfDemo } from '~/lib/vendorshield/demo';
import {
  DEFAULT_QUESTIONNAIRE,
  type Question,
  QUESTIONNAIRE_VERSION,
  type Responses,
  scoreQuestionnaire,
} from '~/lib/vendorshield/questionnaires';
import { getServiceRoleClient } from '~/lib/vendorshield/service-client';

type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

const EXPIRY_DAYS = 30;

export interface QuestionnaireRequestRow {
  id: string;
  supplier_id: string;
  token: string;
  title: string;
  status: 'pending' | 'submitted' | 'expired';
  score: number | null;
  sent_at: string;
  submitted_at: string | null;
  expires_at: string | null;
}

// ─── Interne (authentifié) ────────────────────────────────────────────────────

export async function createQuestionnaireRequestAction(
  supplierId: string,
): Promise<ActionResult<{ token: string }>> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };

  const demo = await denyIfDemo();
  if (demo) return demo;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: supplier } = await (client as any)
    .from('suppliers')
    .select('name')
    .eq('id', supplierId)
    .maybeSingle();
  if (!supplier) return { success: false, error: 'Fournisseur introuvable' };

  const token = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 86_400_000).toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client as any).from('questionnaire_requests').insert({
    account_id: auth.data.id,
    supplier_id: supplierId,
    token,
    title: `Auto-évaluation — ${supplier.name}`,
    version: QUESTIONNAIRE_VERSION,
    questions: DEFAULT_QUESTIONNAIRE,
    status: 'pending',
    expires_at: expiresAt,
    created_by: auth.data.id,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath(`/home/suppliers/${supplierId}`);
  return { success: true, data: { token } };
}

export async function getSupplierQuestionnaires(
  supplierId: string,
): Promise<QuestionnaireRequestRow[]> {
  const client = getSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from('questionnaire_requests')
    .select('id,supplier_id,token,title,status,score,sent_at,submitted_at,expires_at')
    .eq('supplier_id', supplierId)
    .order('sent_at', { ascending: false });
  return (data ?? []) as QuestionnaireRequestRow[];
}

export async function deleteQuestionnaireRequestAction(
  id: string,
  supplierId: string,
): Promise<ActionResult> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };
  const demo = await denyIfDemo();
  if (demo) return demo;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client as any)
    .from('questionnaire_requests')
    .delete()
    .eq('id', id);
  if (error) return { success: false, error: error.message };
  revalidatePath(`/home/suppliers/${supplierId}`);
  return { success: true, data: null };
}

// ─── Public (portail fournisseur, autorisé par le token) ──────────────────────

export interface PublicQuestionnaire {
  title: string;
  supplier_name: string;
  questions: Question[];
  status: 'pending' | 'submitted' | 'expired';
  score: number | null;
}

export async function getRequestByToken(token: string): Promise<PublicQuestionnaire | null> {
  if (!/^[a-f0-9]{48}$/i.test(token)) return null;
  const svc = getServiceRoleClient();

  const { data } = await svc
    .from('questionnaire_requests')
    .select('title,supplier_id,questions,status,score,expires_at')
    .eq('token', token)
    .maybeSingle();
  if (!data) return null;

  const expired = data.expires_at && new Date(data.expires_at).getTime() < Date.now();
  const { data: supplier } = await svc
    .from('suppliers')
    .select('name')
    .eq('id', data.supplier_id)
    .maybeSingle();

  return {
    title: data.title,
    supplier_name: supplier?.name ?? '',
    questions: data.questions as Question[],
    status: expired && data.status === 'pending' ? 'expired' : (data.status as PublicQuestionnaire['status']),
    score: data.score,
  };
}

export async function submitQuestionnaireAction(
  token: string,
  responses: Responses,
): Promise<ActionResult<{ score: number }>> {
  if (!/^[a-f0-9]{48}$/i.test(token)) return { success: false, error: 'Lien invalide' };
  const svc = getServiceRoleClient();

  const { data: req } = await svc
    .from('questionnaire_requests')
    .select('id,questions,status,expires_at,supplier_id,account_id')
    .eq('token', token)
    .maybeSingle();

  if (!req) return { success: false, error: 'Lien invalide' };
  if (req.status === 'submitted') return { success: false, error: 'Questionnaire déjà soumis' };
  if (req.expires_at && new Date(req.expires_at).getTime() < Date.now()) {
    return { success: false, error: 'Lien expiré' };
  }

  const score = scoreQuestionnaire(req.questions as Question[], responses);

  const { error } = await svc
    .from('questionnaire_requests')
    .update({
      responses,
      score,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    })
    .eq('id', req.id);

  if (error) return { success: false, error: error.message };
  return { success: true, data: { score } };
}
