import 'server-only';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface RiskSignal {
  type: 'financial' | 'operational' | 'geopolitical' | 'esg' | 'reputational';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  confidence: number;
  source_hint?: string;
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  action: string;
  rationale: string;
}

export interface AiAnalysis {
  id: string;
  supplier_id: string;
  account_id: string;
  source: 'osint_news' | 'financial_signals' | 'document_analysis' | 'manual_trigger';
  model_used: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  risk_signals: RiskSignal[];
  recommendations: Recommendation[];
  overall_assessment: string | null;
  confidence_score: number | null;
  alerts_created: number;
  error_message: string | null;
  triggered_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// ─── Analyses pour un fournisseur ─────────────────────────────────────────────

export async function getSupplierAnalyses(
  supplierId: string,
  limit = 5,
): Promise<AiAnalysis[]> {
  const client = getSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from('ai_analyses')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as AiAnalysis[];
}

// ─── Dernière analyse complète ────────────────────────────────────────────────

export async function getLatestCompletedAnalysis(
  supplierId: string,
): Promise<AiAnalysis | null> {
  const client = getSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from('ai_analyses')
    .select('*')
    .eq('supplier_id', supplierId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as AiAnalysis | null;
}

// ─── Stats globales OSINT ─────────────────────────────────────────────────────

export interface OsintStats {
  total_analyses: number;
  analyses_today: number;
  signals_detected: number;
  alerts_auto_created: number;
}

export async function getOsintStats(): Promise<OsintStats> {
  const client = getSupabaseServerClient();
  const today: string = new Date().toISOString().slice(0, 10);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from('ai_analyses')
    .select('created_at,risk_signals,alerts_created,status');
  if (!data) return { total_analyses: 0, analyses_today: 0, signals_detected: 0, alerts_auto_created: 0 };
  const completed = data.filter((a: AiAnalysis) => a.status === 'completed');
  return {
    total_analyses: completed.length,
    analyses_today: data.filter((a: AiAnalysis) => a.created_at.slice(0, 10) === today).length,
    signals_detected: completed.reduce((s: number, a: AiAnalysis) => s + (a.risk_signals?.length ?? 0), 0),
    alerts_auto_created: completed.reduce((s: number, a: AiAnalysis) => s + (a.alerts_created ?? 0), 0),
  };
}

// ─── Récentes analyses avec infos fournisseur (pour dashboard) ──────────────

export interface RecentAnalysis extends AiAnalysis {
  supplier_name: string;
}

export async function getRecentAnalyses(limit = 4): Promise<RecentAnalysis[]> {
  const client = getSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from('ai_analyses')
    .select('*, supplier:suppliers(name)')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map((a: any) => ({
    ...a,
    supplier_name: a.supplier?.name ?? 'Unknown',
  })) as RecentAnalysis[];
}
