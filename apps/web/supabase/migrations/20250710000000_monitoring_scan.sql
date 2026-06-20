-- ============================================================================
-- Surveillance automatique des fournisseurs à risque (scan planifié)
-- ----------------------------------------------------------------------------
-- Détecte les conditions QUE LES TRIGGERS NE CAPTENT PAS (elles dépendent du
-- temps, pas d'un UPDATE de score) :
--   1. Documents expirés ou expirant sous 30 jours
--   2. Contrats arrivant à échéance sous 60 jours
--   3. Fournisseurs critiques/à risque sans évaluation récente (> 12 mois)
--
-- Chaque détection insère une alerte (dédupliquée). L'INSERT déclenche le
-- Database Webhook `alerts` → /api/alerts/webhook → email. Aucun email ici.
--
-- Multi-tenant : p_account_id null = tous les comptes (cron global) ;
-- sinon limité à un compte (bouton « scanner maintenant » côté app).
-- ============================================================================

create or replace function public.run_monitoring_scan(p_account_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer := 0;
  v_n     integer;
begin
  -- 1. Documents expirés ou expirant sous 30 jours -------------------------
  insert into public.alerts (account_id, supplier_id, type, severity, title, message, context)
  select
    d.account_id,
    d.supplier_id,
    'document_expiry'::public.alert_type,
    case when d.expiry_date < current_date then 'critical' else 'warning' end::public.alert_severity,
    format('Document à renouveler : %s', d.name),
    format(
      'Le document « %s » %s %s (échéance : %s).',
      d.name,
      case when d.supplier_id is not null then format('du fournisseur %s', coalesce(s.name, '—')) else '' end,
      case when d.expiry_date < current_date then 'a expiré' else 'expire bientôt' end,
      to_char(d.expiry_date, 'DD/MM/YYYY')
    ),
    jsonb_build_object('document_id', d.id, 'expiry_date', d.expiry_date)
  from public.documents d
  left join public.suppliers s on s.id = d.supplier_id
  where d.expiry_date is not null
    and d.expiry_date <= current_date + interval '30 days'
    and (p_account_id is null or d.account_id = p_account_id)
    and not exists (
      select 1 from public.alerts a
      where a.type = 'document_expiry'
        and a.status = 'open'
        and a.context->>'document_id' = d.id::text
    );
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;

  -- 2. Contrats arrivant à échéance sous 60 jours --------------------------
  insert into public.alerts (account_id, supplier_id, type, severity, title, message, context)
  select
    s.account_id,
    s.id,
    'system'::public.alert_type,
    case when s.contract_end_date < current_date + interval '14 days' then 'critical' else 'warning' end::public.alert_severity,
    format('Contrat à renouveler : %s', s.name),
    format('Le contrat du fournisseur %s arrive à échéance le %s.', s.name, to_char(s.contract_end_date, 'DD/MM/YYYY')),
    jsonb_build_object('contract_end_date', s.contract_end_date)
  from public.suppliers s
  where s.contract_end_date is not null
    and s.contract_end_date <= current_date + interval '60 days'
    and s.status = 'active'
    and (p_account_id is null or s.account_id = p_account_id)
    and not exists (
      select 1 from public.alerts a
      where a.type = 'system'
        and a.status = 'open'
        and a.supplier_id = s.id
        and a.context ? 'contract_end_date'
    );
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;

  -- 3. Fournisseurs critiques/à risque sans évaluation récente (> 12 mois) --
  insert into public.alerts (account_id, supplier_id, type, severity, title, message, context)
  select
    s.account_id,
    s.id,
    'system'::public.alert_type,
    'warning'::public.alert_severity,
    format('Évaluation à actualiser : %s', s.name),
    format(
      'Le fournisseur critique %s %s. Une réévaluation est recommandée pour fiabiliser son score de risque.',
      s.name,
      case when la.last_date is null then 'n''a jamais été évalué'
           else format('n''a pas été évalué depuis le %s', to_char(la.last_date, 'DD/MM/YYYY')) end
    ),
    jsonb_build_object('stale_assessment', true, 'last_assessment', la.last_date)
  from public.suppliers s
  left join lateral (
    select max(ra.assessment_date) as last_date
    from public.risk_assessments ra
    where ra.supplier_id = s.id and ra.status = 'completed'
  ) la on true
  where s.criticality in ('critical', 'high')
    and s.status = 'active'
    and (la.last_date is null or la.last_date < current_date - interval '12 months')
    and (p_account_id is null or s.account_id = p_account_id)
    and not exists (
      select 1 from public.alerts a
      where a.type = 'system'
        and a.status = 'open'
        and a.supplier_id = s.id
        and a.context ? 'stale_assessment'
    );
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;

  return v_total;
end;
$$;

grant execute on function public.run_monitoring_scan(uuid) to service_role;

comment on function public.run_monitoring_scan(uuid) is
  'Scan de surveillance : insère des alertes temporelles (docs/contrats expirants, évaluations périmées). p_account_id null = tous les comptes.';

-- ----------------------------------------------------------------------------
-- PLANIFICATION (à exécuter une fois, manuellement, si pg_cron est activé) :
--
--   create extension if not exists pg_cron;
--   select cron.schedule(
--     'vendorshield-daily-monitoring',
--     '0 6 * * *',                       -- tous les jours à 06:00 UTC
--     $$ select public.run_monitoring_scan(); $$
--   );
--
-- Sinon, appeler l'endpoint protégé /api/monitoring/scan via un cron externe
-- (Vercel Cron, GitHub Actions…) avec l'en-tête x-monitoring-secret.
-- ----------------------------------------------------------------------------
