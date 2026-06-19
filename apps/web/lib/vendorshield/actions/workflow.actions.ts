'use server';

import { revalidatePath } from 'next/cache';

import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { denyIfDemo } from '~/lib/vendorshield/demo';
import type { CorrectiveAction, SupplierAudit } from '~/lib/vendorshield/workflow';

type ActionResult = { success: true } | { success: false; error: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function authed(): Promise<{ client: any; userId: string } | { error: string }> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { error: 'Non authentifié' };
  const demo = await denyIfDemo();
  if (demo) return { error: demo.error };
  return { client, userId: auth.data.id };
}

// ─── Audits ───────────────────────────────────────────────────────────────────

export async function getSupplierAudits(supplierId: string): Promise<SupplierAudit[]> {
  const client = getSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from('supplier_audits')
    .select('id,audit_type,title,auditor,scheduled_date,completed_date,status,result,findings')
    .eq('supplier_id', supplierId)
    .order('scheduled_date', { ascending: false, nullsFirst: false });
  return (data ?? []) as SupplierAudit[];
}

export async function createAuditAction(input: {
  supplier_id: string;
  audit_type: string;
  title: string;
  auditor?: string;
  scheduled_date?: string;
}): Promise<ActionResult> {
  const a = await authed();
  if ('error' in a) return { success: false, error: a.error };
  if (!input.title?.trim() || !input.audit_type) {
    return { success: false, error: 'Type et titre requis' };
  }
  const { error } = await a.client.from('supplier_audits').insert({
    account_id: a.userId,
    supplier_id: input.supplier_id,
    audit_type: input.audit_type,
    title: input.title,
    auditor: input.auditor || null,
    scheduled_date: input.scheduled_date || null,
    created_by: a.userId,
  });
  if (error) return { success: false, error: error.message };
  revalidatePath(`/home/suppliers/${input.supplier_id}`);
  return { success: true };
}

export async function updateAuditAction(input: {
  id: string;
  supplier_id: string;
  status?: string;
  result?: string;
  findings?: string;
}): Promise<ActionResult> {
  const a = await authed();
  if ('error' in a) return { success: false, error: a.error };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = {};
  if (input.status) {
    patch.status = input.status;
    if (input.status === 'completed') patch.completed_date = new Date().toISOString().slice(0, 10);
  }
  if (input.result !== undefined) patch.result = input.result || null;
  if (input.findings !== undefined) patch.findings = input.findings || null;

  const { error } = await a.client.from('supplier_audits').update(patch).eq('id', input.id);
  if (error) return { success: false, error: error.message };
  revalidatePath(`/home/suppliers/${input.supplier_id}`);
  return { success: true };
}

export async function deleteAuditAction(id: string, supplierId: string): Promise<ActionResult> {
  const a = await authed();
  if ('error' in a) return { success: false, error: a.error };
  const { error } = await a.client.from('supplier_audits').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  revalidatePath(`/home/suppliers/${supplierId}`);
  return { success: true };
}

// ─── Plans d'action (CAPA) ─────────────────────────────────────────────────────

export async function getSupplierActions(supplierId: string): Promise<CorrectiveAction[]> {
  const client = getSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from('corrective_actions')
    .select('id,title,description,source,priority,status,owner,due_date')
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false });
  return (data ?? []) as CorrectiveAction[];
}

export async function createActionAction(input: {
  supplier_id: string;
  title: string;
  priority?: string;
  owner?: string;
  due_date?: string;
  source?: string;
}): Promise<ActionResult> {
  const a = await authed();
  if ('error' in a) return { success: false, error: a.error };
  if (!input.title?.trim()) return { success: false, error: 'Titre requis' };
  const { error } = await a.client.from('corrective_actions').insert({
    account_id: a.userId,
    supplier_id: input.supplier_id,
    title: input.title,
    priority: input.priority || 'medium',
    owner: input.owner || null,
    due_date: input.due_date || null,
    source: input.source || 'manual',
    created_by: a.userId,
  });
  if (error) return { success: false, error: error.message };
  revalidatePath(`/home/suppliers/${input.supplier_id}`);
  return { success: true };
}

export async function updateActionStatusAction(
  id: string,
  supplierId: string,
  status: string,
): Promise<ActionResult> {
  const a = await authed();
  if ('error' in a) return { success: false, error: a.error };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = { status };
  if (status === 'done') patch.completed_date = new Date().toISOString().slice(0, 10);
  const { error } = await a.client.from('corrective_actions').update(patch).eq('id', id);
  if (error) return { success: false, error: error.message };
  revalidatePath(`/home/suppliers/${supplierId}`);
  return { success: true };
}

export async function deleteActionAction(id: string, supplierId: string): Promise<ActionResult> {
  const a = await authed();
  if ('error' in a) return { success: false, error: a.error };
  const { error } = await a.client.from('corrective_actions').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  revalidatePath(`/home/suppliers/${supplierId}`);
  return { success: true };
}
