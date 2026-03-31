/*
 * ================================================================
 * VendorShield V2 — Prédiction de faillite
 * Migration : 20250317000000_bankruptcy_predictions.sql
 * ================================================================
 */

-- ── Type énumération niveau de risque faillite ────────────────────────────────
create type public.bankruptcy_risk_zone as enum (
  'safe',      -- Z > 2.6  : zone sûre
  'grey',      -- 1.1-2.6 : zone grise
  'distress'   -- Z < 1.1  : détresse financière
);

-- ── Table principale ──────────────────────────────────────────────────────────
create table if not exists public.bankruptcy_predictions (
  id                    uuid primary key default extensions.uuid_generate_v4(),
  account_id            uuid not null references public.accounts(id) on delete cascade,
  supplier_id           uuid not null references public.suppliers(id) on delete cascade,

  -- Score composite adapté Altman Z
  z_score               numeric(5, 3) not null,          -- Score Z calculé (0-4+)
  risk_zone             public.bankruptcy_risk_zone not null,

  -- Composantes du scoring (chacune 0-100)
  component_credit      smallint,  -- Notation de crédit & solvabilité
  component_debt        smallint,  -- Niveau d'endettement
  component_revenue     smallint,  -- Stabilité CA
  component_payments    smallint,  -- Historique paiements
  component_profitability smallint, -- Rentabilité & marges
  component_operational smallint,  -- Score opérationnel global
  component_geopolitical smallint, -- Score géopolitique

  -- Probabilités de défaut par horizon (%)
  probability_6m        smallint check (probability_6m between 0 and 100),
  probability_12m       smallint check (probability_12m between 0 and 100),
  probability_24m       smallint check (probability_24m between 0 and 100),

  -- Tendance sur évaluations historiques
  score_trend_3m        numeric(5,2),  -- variation score financier sur 3 mois
  assessment_count      smallint,      -- nombre d'évaluations historiques utilisées

  -- Interprétation LLM
  narrative_6m          text,          -- analyse narrative horizon 6 mois
  narrative_12m         text,          -- analyse narrative horizon 12 mois
  narrative_24m         text,          -- analyse narrative horizon 24 mois
  key_risk_factors      jsonb not null default '[]'::jsonb,  -- [{factor, impact, mitigation}]
  early_warning_signals jsonb not null default '[]'::jsonb,  -- signaux précurseurs détectés

  -- Meta
  model_version         varchar(20) not null default 'v2.0-altman-adapted',
  model_used            varchar(100) not null default 'llama-3.3-70b-versatile',
  prompt_tokens         integer,
  completion_tokens     integer,
  triggered_by          uuid references auth.users(id),
  created_at            timestamp with time zone not null default now()
);

comment on table public.bankruptcy_predictions
  is 'Prédictions de risque de faillite fournisseur — score Altman Z adapté + interprétation LLM';
comment on column public.bankruptcy_predictions.z_score
  is 'Score Z composite : >2.6 sûr, 1.1-2.6 zone grise, <1.1 détresse';
comment on column public.bankruptcy_predictions.key_risk_factors
  is '[{factor:string, impact:"high"|"medium"|"low", mitigation:string}]';

-- Index
create index idx_bp_supplier    on public.bankruptcy_predictions(supplier_id);
create index idx_bp_account     on public.bankruptcy_predictions(account_id);
create index idx_bp_zone        on public.bankruptcy_predictions(account_id, risk_zone);
create index idx_bp_created     on public.bankruptcy_predictions(account_id, created_at desc);

-- RLS
alter table public.bankruptcy_predictions enable row level security;

create policy bp_select on public.bankruptcy_predictions
  for select to authenticated
  using (account_id = (select auth.uid()));

create policy bp_insert on public.bankruptcy_predictions
  for insert to authenticated
  with check (account_id = (select auth.uid()));

revoke all on public.bankruptcy_predictions from authenticated, service_role;
grant select, insert on public.bankruptcy_predictions to authenticated, service_role;

-- ── Vue résumée pour le dashboard ─────────────────────────────────────────────
create or replace view public.supplier_bankruptcy_latest as
select distinct on (supplier_id)
  bp.*,
  s.name        as supplier_name,
  s.category    as supplier_category,
  s.criticality as supplier_criticality,
  s.is_sole_source,
  s.annual_spend_eur
from public.bankruptcy_predictions bp
join public.suppliers s on s.id = bp.supplier_id
order by supplier_id, created_at desc;

comment on view public.supplier_bankruptcy_latest
  is 'Dernière prédiction de faillite par fournisseur';
