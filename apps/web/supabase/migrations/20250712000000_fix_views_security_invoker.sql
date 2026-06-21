-- ============================================================================
-- CORRECTIF SÉCURITÉ — isolation multi-tenant des vues
-- ----------------------------------------------------------------------------
-- Sans `security_invoker = true`, une vue s'exécute avec les droits de son
-- PROPRIÉTAIRE (postgres) et CONTOURNE la RLS des tables sous-jacentes : tout
-- utilisateur voit alors les données de TOUS les comptes (fuite de données).
--
-- `security_invoker = true` fait exécuter la vue avec les droits de
-- l'UTILISATEUR qui l'interroge → la RLS (account_id = auth.uid()) s'applique,
-- chaque compte ne voit que ses propres données.
--
-- À appliquer sur la base distante (ces vues existaient déjà sans l'option).
-- ============================================================================

alter view public.supplier_risk_summary     set (security_invoker = true);
alter view public.account_risk_dashboard     set (security_invoker = true);
alter view public.supplier_bankruptcy_latest set (security_invoker = true);
alter view public.supply_chain_graph         set (security_invoker = true);
