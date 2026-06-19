import 'server-only';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { docStatus } from '~/lib/vendorshield/documents';

/**
 * Posture cyber dérivée (non-invasive) des signaux déjà collectés :
 * certification ISO 27001 et réponses cyber du dernier questionnaire soumis.
 * Évite de modifier le moteur de scoring à 24 critères.
 */

export interface CyberSignal {
  /** Clé i18n (vendorshield:cyber.signal.<key>). */
  key: string;
  ok: boolean;
}

export interface CyberPosture {
  has_data: boolean;
  score: number; // 0-100
  level: 'low' | 'medium' | 'high' | 'critical';
  signals: CyberSignal[];
}

export async function getSupplierCyberPosture(supplierId: string): Promise<CyberPosture> {
  const client = getSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = client as any;

  const [docsRes, qRes] = await Promise.all([
    c
      .from('supplier_documents')
      .select('doc_type,expiry_date')
      .eq('supplier_id', supplierId)
      .eq('doc_type', 'iso_27001'),
    c
      .from('questionnaire_requests')
      .select('responses')
      .eq('supplier_id', supplierId)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const iso27001 = ((docsRes.data ?? []) as { expiry_date: string | null }[]).some(
    (d) => docStatus(d.expiry_date) !== 'expired',
  );

  const responses = (qRes.data?.responses ?? null) as Record<string, unknown> | null;
  const hasPolicy = responses ? responses.cyber_policy === 'oui' : null;
  const hadIncident = responses ? responses.cyber_incident === 'oui' : null;

  const signals: CyberSignal[] = [{ key: 'iso27001', ok: iso27001 }];
  if (hasPolicy !== null) {
    signals.push({ key: 'securityPolicy', ok: hasPolicy });
  }
  if (hadIncident !== null) {
    signals.push({ key: 'noMajorIncident', ok: !hadIncident });
  }

  const has_data = iso27001 || responses !== null;

  // Score : moyenne des signaux disponibles (+ bonus ISO).
  const okCount = signals.filter((s) => s.ok).length;
  const score = signals.length > 0 ? Math.round((okCount / signals.length) * 100) : 0;
  const level = score >= 75 ? 'low' : score >= 50 ? 'medium' : score >= 25 ? 'high' : 'critical';

  return { has_data, score, level, signals };
}
