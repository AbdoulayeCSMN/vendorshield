'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { denyIfDemo } from '~/lib/vendorshield/demo';
import {
  type ComplianceSummary,
  REQUIRED_DOC_TYPES,
  type SupplierDocument,
  docStatus,
} from '~/lib/vendorshield/documents';

type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function getSupplierCompliance(supplierId: string): Promise<ComplianceSummary> {
  const client = getSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from('supplier_documents')
    .select('id,doc_type,name,issuer,reference,issued_date,expiry_date,file_url,notes')
    .eq('supplier_id', supplierId)
    .order('expiry_date', { ascending: true, nullsFirst: false });

  const documents: SupplierDocument[] = ((data ?? []) as Record<string, unknown>[]).map((d) => ({
    id: d.id as string,
    doc_type: d.doc_type as string,
    name: d.name as string,
    issuer: (d.issuer as string | null) ?? null,
    reference: (d.reference as string | null) ?? null,
    issued_date: (d.issued_date as string | null) ?? null,
    expiry_date: (d.expiry_date as string | null) ?? null,
    file_url: (d.file_url as string | null) ?? null,
    notes: (d.notes as string | null) ?? null,
    status: docStatus((d.expiry_date as string | null) ?? null),
  }));

  const required = REQUIRED_DOC_TYPES.map((t) => {
    const doc = documents.find((d) => d.doc_type === t);
    return {
      doc_type: t,
      present: !!doc && doc.status !== 'expired',
      status: doc?.status ?? null,
    };
  });

  const coverage = Math.round(
    (required.filter((r) => r.present).length / required.length) * 100,
  );

  return {
    documents,
    required,
    expired_count: documents.filter((d) => d.status === 'expired').length,
    expiring_count: documents.filter((d) => d.status === 'expiring').length,
    coverage,
  };
}

const AddDocSchema = z.object({
  supplier_id: z.string().uuid(),
  doc_type: z.string().min(1),
  name: z.string().min(1, 'Nom requis'),
  issuer: z.string().optional(),
  reference: z.string().optional(),
  issued_date: z.string().optional(),
  expiry_date: z.string().optional(),
  file_url: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional(),
});

export async function addSupplierDocumentAction(
  input: z.infer<typeof AddDocSchema>,
): Promise<ActionResult> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };

  const demo = await denyIfDemo();
  if (demo) return demo;

  const parsed = AddDocSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((i) => i.message).join(', ') };
  }
  const d = parsed.data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client as any).from('supplier_documents').insert({
    account_id: auth.data.id,
    supplier_id: d.supplier_id,
    doc_type: d.doc_type,
    name: d.name,
    issuer: d.issuer || null,
    reference: d.reference || null,
    issued_date: d.issued_date || null,
    expiry_date: d.expiry_date || null,
    file_url: d.file_url || null,
    notes: d.notes || null,
    created_by: auth.data.id,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath(`/home/suppliers/${d.supplier_id}`);
  return { success: true, data: null };
}

export async function deleteSupplierDocumentAction(
  id: string,
  supplierId: string,
): Promise<ActionResult> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };

  const demo = await denyIfDemo();
  if (demo) return demo;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client as any).from('supplier_documents').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  revalidatePath(`/home/suppliers/${supplierId}`);
  return { success: true, data: null };
}
