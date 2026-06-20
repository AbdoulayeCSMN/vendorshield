-- ============================================================================
-- VendorShield — Vider la table fournisseurs (SANS rien réinsérer)
-- À exécuter dans Supabase → SQL Editor.
--
-- ⚠️ DESTRUCTIF / IRRÉVERSIBLE : supprime TOUS les fournisseurs et, en cascade
-- (ON DELETE CASCADE), leurs livraisons, évaluations de risque, alertes,
-- prédictions (faillite + opérationnelles), documents de conformité,
-- questionnaires, audits et plans d'action (CAPA).
-- ============================================================================

DELETE FROM public.suppliers;

-- ── Variante : limiter à UN compte précis (multi-tenant) ────────────────────
-- DELETE FROM public.suppliers WHERE account_id = '<account-uuid>';
--
-- Pour retrouver l'uuid de ton compte :
-- SELECT account_id, count(*) FROM public.suppliers GROUP BY account_id;
