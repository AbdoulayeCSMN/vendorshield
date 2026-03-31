/**
 * VendorShield — Edge Function : osint-monitor
 *
 * Déclenchement : POST /functions/v1/osint-monitor
 * Body : { supplier_id: string, account_id: string, triggered_by?: string }
 *
 * Variables d'environnement :
 *   GROQ_API_KEY   → clé Groq gratuite (console.groq.com)
 *   MOCK_AI=true   → mode développement sans API
 *
 * Déploiement :
 *   supabase functions deploy osint-monitor
 *   supabase secrets set GROQ_API_KEY=gsk_...
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { analyzeSupplier, type SupplierContext } from '../_shared/llm.ts';

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  const supabaseUrl           = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const mockMode              = Deno.env.get('MOCK_AI') === 'true';

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // ── Parse du body ──────────────────────────────────────────────────────────

  let body: { supplier_id: string; account_id: string; triggered_by?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Corps JSON invalide' }, { status: 400 });
  }

  const { supplier_id, account_id, triggered_by } = body;

  if (!supplier_id || !account_id) {
    return Response.json({ error: 'supplier_id et account_id requis' }, { status: 400 });
  }

  // ── Création de l'entrée d'analyse ─────────────────────────────────────────

  const { data: analysis, error: insertErr } = await supabase
    .from('ai_analyses')
    .insert({
      account_id,
      supplier_id,
      source: 'manual_trigger',
      model_used: mockMode ? 'mock' : 'llama-3.3-70b-versatile',
      status: 'running',
      triggered_by: triggered_by ?? null,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertErr || !analysis) {
    return Response.json(
      { error: insertErr?.message ?? 'Échec de création de l\'analyse' },
      { status: 500 }
    );
  }

  const analysisId = analysis.id;

  try {
    // ── Récupération du contexte fournisseur ───────────────────────────────

    const [supplierRes, assessmentRes, alertsRes, prevRes] = await Promise.all([
      supabase
        .from('suppliers')
        .select('*')
        .eq('id', supplier_id)
        .single(),
      supabase
        .from('risk_assessments')
        .select('executive_summary, global_score, assessment_date, status')
        .eq('supplier_id', supplier_id)
        .in('status', ['completed', 'approved'])
        .order('assessment_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('alerts')
        .select('id', { count: 'exact', head: true })
        .eq('supplier_id', supplier_id)
        .eq('status', 'open'),
      supabase
        .from('ai_analyses')
        .select('overall_assessment, created_at')
        .eq('supplier_id', supplier_id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (!supplierRes.data) {
      throw new Error('Fournisseur introuvable');
    }

    const s = supplierRes.data;
    const ctx: SupplierContext = {
      name:                    s.name,
      country_code:            s.country_code,
      country_name:            s.country_name,
      category:                s.category,
      criticality:             s.criticality,
      global_score:            s.global_score,
      financial_score:         s.financial_score,
      operational_score:       s.operational_score,
      geopolitical_score:      s.geopolitical_score,
      esg_score:               s.esg_score,
      is_sole_source:          s.is_sole_source,
      annual_revenue_eur:      s.annual_revenue_eur,
      employee_count:          s.employee_count,
      credit_rating:           s.credit_rating,
      notes:                   s.notes,
      latest_assessment_summary: assessmentRes.data?.executive_summary ?? null,
      open_alerts_count:       alertsRes.count ?? 0,
    };

    // ── Analyse LLM (Groq ou mock) ─────────────────────────────────────────

    const result = await analyzeSupplier(ctx);

    // ── Création des alertes pour signaux significatifs ────────────────────

    let alertsCreated = 0;
    const toAlert = result.risk_signals.filter(
      (s) => s.severity !== 'info' || s.confidence >= 80
    );

    for (const signal of toAlert) {
      // Déduplication — évite les doublons sur alerte ouverte identique
      const { data: existing } = await supabase
        .from('alerts')
        .select('id')
        .eq('supplier_id', supplier_id)
        .eq('status', 'open')
        .eq('title', signal.title)
        .limit(1)
        .maybeSingle();

      if (existing) continue;

      const { error: alertErr } = await supabase.from('alerts').insert({
        account_id,
        supplier_id,
        type: 'system',
        severity: signal.severity,
        status: 'open',
        title: signal.title,
        message: signal.description,
        context: {
          ai_analysis_id:  analysisId,
          signal_type:     signal.type,
          confidence:      signal.confidence,
          source_hint:     signal.source_hint ?? null,
          model:           mockMode ? 'mock' : 'llama-3.3-70b-versatile',
          mock_mode:       mockMode,
        },
      });

      if (!alertErr) alertsCreated++;
    }

    // ── Persist du résultat ────────────────────────────────────────────────

    await supabase
      .from('ai_analyses')
      .update({
        status:             'completed',
        risk_signals:       result.risk_signals,
        recommendations:    result.recommendations,
        overall_assessment: result.overall_assessment,
        confidence_score:   result.confidence_score,
        prompt_tokens:      result.prompt_tokens,
        completion_tokens:  result.completion_tokens,
        alerts_created:     alertsCreated,
        completed_at:       new Date().toISOString(),
      })
      .eq('id', analysisId);

    return Response.json({
      success:            true,
      analysis_id:        analysisId,
      signals_detected:   result.risk_signals.length,
      alerts_created:     alertsCreated,
      overall_assessment: result.overall_assessment,
      confidence_score:   result.confidence_score,
      mock_mode:          mockMode,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';

    await supabase
      .from('ai_analyses')
      .update({
        status:        'failed',
        error_message: message,
        completed_at:  new Date().toISOString(),
      })
      .eq('id', analysisId);

    return Response.json(
      { error: message, analysis_id: analysisId },
      { status: 500 }
    );
  }
});
