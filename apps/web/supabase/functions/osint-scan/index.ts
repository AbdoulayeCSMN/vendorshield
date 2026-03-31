/**
 * VendorShield — Edge Function : osint-scan
 *
 * Déclenchement : Cron Supabase — lundi-vendredi à 7h00 UTC
 * Config config.toml :
 *   [functions.osint-scan.schedule]
 *   type = "cron"
 *   value = "0 7 * * 1-5"
 *
 * Variables d'environnement :
 *   GROQ_API_KEY   → clé Groq gratuite (console.groq.com)
 *   MOCK_AI=true   → mode développement sans API
 *   SCAN_LIMIT     → nombre de fournisseurs par run (défaut : 10)
 *
 * Déploiement :
 *   supabase functions deploy osint-scan --no-verify-jwt
 *   supabase secrets set GROQ_API_KEY=gsk_...
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { analyzeSupplier, type SupplierContext } from '../_shared/llm.ts';

Deno.serve(async () => {
  const supabaseUrl        = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const mockMode           = Deno.env.get('MOCK_AI') === 'true';
  const scanLimit          = parseInt(Deno.env.get('SCAN_LIMIT') ?? '10', 10);

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // ── Récupérer les fournisseurs actifs prioritaires ─────────────────────────
  // Priorité : fournisseurs jamais analysés par l'IA, puis les plus anciennement analysés
  // Pondération : sole_source et criticality élevée en premier

  const { data: suppliers, error } = await supabase
    .from('suppliers')
    .select(`
      id, account_id, name, country_code, country_name, category,
      criticality, global_score, financial_score, operational_score,
      geopolitical_score, esg_score, is_sole_source,
      annual_revenue_eur, employee_count, credit_rating, notes
    `)
    .eq('status', 'active')
    .order('is_sole_source', { ascending: false })   // sole source en premier
    .order('global_score',   { ascending: true, nullsFirst: true }) // plus risqués en premier
    .limit(scanLimit);

  if (error || !suppliers?.length) {
    return Response.json({
      scanned: 0,
      message: error ? error.message : 'Aucun fournisseur actif',
    });
  }

  const results = [];
  let totalAlerts = 0;

  for (const supplier of suppliers) {
    try {
      // Récupérer le contexte complémentaire
      const [assessmentRes, alertsRes] = await Promise.all([
        supabase
          .from('risk_assessments')
          .select('executive_summary')
          .eq('supplier_id', supplier.id)
          .in('status', ['completed', 'approved'])
          .order('assessment_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('alerts')
          .select('id', { count: 'exact', head: true })
          .eq('supplier_id', supplier.id)
          .eq('status', 'open'),
      ]);

      const ctx: SupplierContext = {
        name:                     supplier.name,
        country_code:             supplier.country_code,
        country_name:             supplier.country_name,
        category:                 supplier.category,
        criticality:              supplier.criticality,
        global_score:             supplier.global_score,
        financial_score:          supplier.financial_score,
        operational_score:        supplier.operational_score,
        geopolitical_score:       supplier.geopolitical_score,
        esg_score:                supplier.esg_score,
        is_sole_source:           supplier.is_sole_source,
        annual_revenue_eur:       supplier.annual_revenue_eur,
        employee_count:           supplier.employee_count,
        credit_rating:            supplier.credit_rating,
        notes:                    supplier.notes,
        latest_assessment_summary: assessmentRes.data?.executive_summary ?? null,
        open_alerts_count:        alertsRes.count ?? 0,
      };

      // ── Analyse IA ─────────────────────────────────────────────────────────

      const result = await analyzeSupplier(ctx);

      // ── Persister l'analyse ────────────────────────────────────────────────

      const { data: savedAnalysis } = await supabase
        .from('ai_analyses')
        .insert({
          account_id:         supplier.account_id,
          supplier_id:        supplier.id,
          source:             'osint_news',
          model_used:         mockMode ? 'mock' : 'llama-3.3-70b-versatile',
          status:             'completed',
          risk_signals:       result.risk_signals,
          recommendations:    result.recommendations,
          overall_assessment: result.overall_assessment,
          confidence_score:   result.confidence_score,
          prompt_tokens:      result.prompt_tokens,
          completion_tokens:  result.completion_tokens,
          alerts_created:     0, // mis à jour après
          started_at:         new Date().toISOString(),
          completed_at:       new Date().toISOString(),
        })
        .select('id')
        .single();

      const analysisId = savedAnalysis?.id;

      // ── Créer les alertes pour les signaux significatifs ───────────────────

      const toAlert = result.risk_signals.filter(
        (s) => s.severity !== 'info' && s.confidence >= 70
      );

      let alertsForSupplier = 0;

      if (toAlert.length > 0) {
        // Supprimer les anciennes alertes IA ouvertes pour ce fournisseur
        // (évite l'accumulation lors des runs quotidiens)
        await supabase
          .from('alerts')
          .delete()
          .eq('supplier_id', supplier.id)
          .eq('type', 'system')
          .eq('status', 'open');

        const { data: created } = await supabase
          .from('alerts')
          .insert(
            toAlert.map((s) => ({
              account_id:   supplier.account_id,
              supplier_id:  supplier.id,
              type:         'system',
              severity:     s.severity,
              status:       'open',
              title:        `[IA] ${s.title}`,
              message:      s.description,
              context: {
                ai_analysis_id: analysisId,
                signal_type:    s.type,
                confidence:     s.confidence,
                source_hint:    s.source_hint ?? null,
                model:          mockMode ? 'mock' : 'llama-3.3-70b-versatile',
                cron_run:       true,
                scanned_at:     new Date().toISOString(),
              },
            }))
          )
          .select('id');

        alertsForSupplier = created?.length ?? 0;
        totalAlerts += alertsForSupplier;

        // Mettre à jour le compteur dans ai_analyses
        if (analysisId) {
          await supabase
            .from('ai_analyses')
            .update({ alerts_created: alertsForSupplier })
            .eq('id', analysisId);
        }
      }

      results.push({
        id:             supplier.id,
        name:           supplier.name,
        signals:        result.risk_signals.length,
        alerts_created: alertsForSupplier,
        risk_level:     result.risk_signals.some((s) => s.severity === 'critical') ? 'critical'
                      : result.risk_signals.some((s) => s.severity === 'warning')  ? 'warning'
                      : 'ok',
      });

      // Délai entre appels API pour respecter le rate limit Groq (en mock : court)
      await new Promise((r) => setTimeout(r, mockMode ? 50 : 500));

    } catch (err) {
      results.push({
        id:    supplier.id,
        name:  supplier.name,
        error: err instanceof Error ? err.message : 'Erreur inconnue',
      });
    }
  }

  return Response.json({
    scanned:              results.length,
    total_alerts_created: totalAlerts,
    mock_mode:            mockMode,
    timestamp:            new Date().toISOString(),
    results,
  });
});
