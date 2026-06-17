'use server';

import { revalidatePath } from 'next/cache';

import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { generateMockAnalysis } from '../ai-mock';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface AiAnalysisResult {
  success: boolean;
  analysis_id?: string;
  signals_detected?: number;
  alerts_created?: number;
  overall_assessment?: string;
  confidence_score?: number;
  mock_mode?: boolean;
  error?: string;
}

export interface AiAnalysis {
  id: string;
  supplier_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  model_used: string;
  overall_assessment: string | null;
  confidence_score: number | null;
  risk_signals: {
    type: string;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    description: string;
    confidence: number;
    source_hint?: string;
  }[];
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    rationale: string;
  }[];
  alerts_created: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
}

export type AiConfigStatus =
  | { configured: true;  mode: 'openrouter' | 'groq' | 'mock'; label: string }
  | { configured: false; mode: null; label: string };

// ─── Statut de configuration ──────────────────────────────────────────────────

export async function getAiConfigStatus(): Promise<AiConfigStatus> {
  const mockMode      = process.env.MOCK_AI === 'true';
  const openRouterKey = process.env.OPENROUTER_API_KEY ?? '';
  const groqKey       = process.env.GROQ_API_KEY ?? '';

  if (mockMode)      return { configured: true,  mode: 'mock',       label: 'Mode simulation (dev)' };
  if (openRouterKey) return { configured: true,  mode: 'openrouter', label: 'OpenRouter (modèle gratuit)' };
  if (groqKey)       return { configured: true,  mode: 'groq',       label: 'Groq Llama 3.3 (gratuit)' };
  return { configured: false, mode: null, label: 'Configurer OPENROUTER_API_KEY ou MOCK_AI=true' };
}

// ─── Analyse en mode mock (exécutée directement dans la Server Action) ────────

async function runMockAnalysis(
  supplierId: string,
  accountId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
): Promise<AiAnalysisResult> {
  // Récupérer les données du fournisseur
  const { data: supplier, error: supplierErr } = await client
    .from('suppliers')
    .select('name,country_code,country_name,category,criticality,global_score,financial_score,operational_score,geopolitical_score,esg_score,is_sole_source,notes')
    .eq('id', supplierId)
    .single();

  if (supplierErr || !supplier) {
    return { success: false, error: 'Fournisseur introuvable' };
  }

  // Simuler une latence réaliste
  await new Promise((r) => setTimeout(r, 400));

  // Générer les signaux mock depuis les données réelles
  const result = generateMockAnalysis(supplier);

  // Persister l'analyse
  const { data: analysis, error: insertErr } = await client
    .from('ai_analyses')
    .insert({
      account_id:         accountId,
      supplier_id:        supplierId,
      source:             'manual_trigger',
      model_used:         'mock',
      status:             'completed',
      risk_signals:       result.risk_signals,
      recommendations:    result.recommendations,
      overall_assessment: result.overall_assessment,
      confidence_score:   result.confidence_score,
      prompt_tokens:      null,
      completion_tokens:  null,
      alerts_created:     0,
      started_at:         new Date().toISOString(),
      completed_at:       new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertErr || !analysis) {
    return { success: false, error: insertErr?.message ?? 'Erreur de persistance' };
  }

  // Créer les alertes pour les signaux significatifs
  let alertsCreated = 0;
  const toAlert = result.risk_signals.filter(
    (s) => s.severity !== 'info' || s.confidence >= 80,
  );

  for (const signal of toAlert) {
    // Déduplication
    const { data: existing } = await client
      .from('alerts')
      .select('id')
      .eq('supplier_id', supplierId)
      .eq('status', 'open')
      .eq('title', signal.title)
      .limit(1)
      .maybeSingle();

    if (existing) continue;

    const { error: alertErr } = await client.from('alerts').insert({
      account_id:  accountId,
      supplier_id: supplierId,
      type:        'system',
      severity:    signal.severity,
      status:      'open',
      title:       signal.title,
      message:     signal.description,
      context: {
        ai_analysis_id: analysis.id,
        signal_type:    signal.type,
        confidence:     signal.confidence,
        source_hint:    signal.source_hint ?? null,
        model:          'mock',
        mock_mode:      true,
      },
    });

    if (!alertErr) alertsCreated++;
  }

  // Mettre à jour le compteur
  if (alertsCreated > 0) {
    await client
      .from('ai_analyses')
      .update({ alerts_created: alertsCreated })
      .eq('id', analysis.id);
  }

  return {
    success:            true,
    analysis_id:        analysis.id,
    signals_detected:   result.risk_signals.length,
    alerts_created:     alertsCreated,
    overall_assessment: result.overall_assessment,
    confidence_score:   result.confidence_score,
    mock_mode:          true,
  };
}

// ─── Analyse via Edge Function (Groq en production) ───────────────────────────

async function runEdgeFunctionAnalysis(
  supplierId: string,
  accountId: string,
  userId: string,
): Promise<AiAnalysisResult> {
  const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { success: false, error: 'Configuration Supabase manquante (.env)' };
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/osint-monitor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        supplier_id:  supplierId,
        account_id:   accountId,
        triggered_by: userId,
      }),
    });

    // Détecter une réponse HTML (Edge Function non déployée)
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      return {
        success: false,
        error: "L'Edge Function osint-monitor n'est pas accessible. " +
               "En développement local, activer MOCK_AI=true dans .env.",
      };
    }

    const data = await res.json();

    if (!res.ok || !data.success) {
      if (data.error?.includes('API') && data.error?.includes('configurée')) {
        return {
          success: false,
          error:
            '🔑 Clé LLM manquante. Exécuter : supabase secrets set OPENROUTER_API_KEY=sk-or-...',
        };
      }
      return { success: false, error: data.error ?? 'Erreur interne' };
    }

    return {
      success:            true,
      analysis_id:        data.analysis_id,
      signals_detected:   data.signals_detected,
      alerts_created:     data.alerts_created,
      overall_assessment: data.overall_assessment,
      confidence_score:   data.confidence_score,
      mock_mode:          false,
    };
  } catch (err) {
    return {
      success: false,
      error: `Impossible de joindre l'Edge Function. Vérifier que Supabase est démarré. (${(err as Error).message})`,
    };
  }
}

// ─── Point d'entrée principal ─────────────────────────────────────────────────

export async function triggerAiAnalysisAction(
  supplierId: string,
): Promise<AiAnalysisResult> {
  const client = getSupabaseServerClient();
  const auth   = await requireUser(client);

  if (auth.error) return { success: false, error: 'Non authentifié' };

  const mockMode = process.env.MOCK_AI === 'true';
  let result: AiAnalysisResult;

  if (mockMode) {
    // Mode dev : tout s'exécute ici, pas d'Edge Function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result = await runMockAnalysis(supplierId, auth.data.id, client as any);
  } else {
    // Mode prod : déléguer à l'Edge Function Groq
    result = await runEdgeFunctionAnalysis(supplierId, auth.data.id, auth.data.id);
  }

  if (result.success) {
    revalidatePath(`/home/suppliers/${supplierId}`);
    revalidatePath('/home/alerts');
    revalidatePath('/home');
  }

  return result;
}

// ─── Récupérer les analyses d'un fournisseur ──────────────────────────────────

export async function getSupplierAnalyses(
  supplierId: string,
  limit = 5,
): Promise<AiAnalysis[]> {
  const client = getSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from('ai_analyses')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as AiAnalysis[];
}

// ─── Dernières analyses pour le dashboard ────────────────────────────────────

export async function getRecentAnalyses(limit = 5): Promise<
  (AiAnalysis & {
    supplier: { id: string; name: string; country_code: string | null } | null;
  })[]
> {
  const client = getSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from('ai_analyses')
    .select('*, supplier:suppliers(id, name, country_code)')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as (AiAnalysis & {
    supplier: { id: string; name: string; country_code: string | null } | null;
  })[];
}
