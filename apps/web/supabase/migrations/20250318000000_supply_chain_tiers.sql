/*
 * VendorShield V2 — Graph multi-tiers supply chain
 * Migration : 20250318000000_supply_chain_tiers.sql
 */

-- ── Nœuds Tier 2/3/4 générés par IA ─────────────────────────────────────────
-- Chaque ligne = un fournisseur probable d'un de nos Tier 1
-- Tier 1 = nos fournisseurs directs (table suppliers)
-- Tier 2 = fournisseurs de nos fournisseurs (générés IA)
-- Tier 3/4 = profondeur supplémentaire

create table if not exists public.supplier_tiers (
  id                uuid primary key default extensions.uuid_generate_v4(),
  account_id        uuid not null references public.accounts(id) on delete cascade,

  -- Relation hiérarchique
  tier_level        smallint not null check (tier_level between 2 and 4),
  parent_supplier_id uuid not null references public.suppliers(id) on delete cascade,

  -- Infos du nœud IA
  name              varchar(255) not null,
  category          varchar(100) not null,
  country_code      varchar(2),
  country_name      varchar(100),
  inferred_role     varchar(255),  -- "Fournisseur de silicium brut", "Opérateur logistique maritime"

  -- Scoring estimé (IA, pas calculé depuis risk_factors réels)
  estimated_risk_level varchar(20) check (estimated_risk_level in ('low','medium','high','critical','unknown')),
  estimated_score   smallint check (estimated_score between 0 and 100),

  -- Criticité estimée pour la supply chain
  supply_chain_impact varchar(20) check (supply_chain_impact in ('high','medium','low')),
  is_estimated_sole_source boolean default false,

  -- Justification IA
  ai_rationale      text,         -- pourquoi ce Tier 2 existe
  confidence        smallint check (confidence between 0 and 100),

  -- Source
  model_used        varchar(100) not null default 'llama-3.3-70b-versatile',
  generation_run_id uuid,         -- pour grouper par run d'enrichissement

  created_at        timestamp with time zone not null default now(),
  updated_at        timestamp with time zone not null default now()
);

comment on table public.supplier_tiers
  is 'Nœuds Tier 2-4 inférés par IA depuis les fournisseurs Tier 1';

-- ── Liens entre nœuds (graph edges) ──────────────────────────────────────────
-- Relie les nœuds tier entre eux (Tier2 → Tier3, etc.)

create table if not exists public.supplier_tier_links (
  id              uuid primary key default extensions.uuid_generate_v4(),
  account_id      uuid not null references public.accounts(id) on delete cascade,
  from_tier_id    uuid references public.supplier_tiers(id) on delete cascade,
  from_supplier_id uuid references public.suppliers(id) on delete cascade, -- pour lien Tier1→Tier2
  to_tier_id      uuid not null references public.supplier_tiers(id) on delete cascade,
  link_type       varchar(50) default 'supplies',  -- supplies, logistics, energy, raw_material
  created_at      timestamp with time zone not null default now(),
  constraint chk_from_node check (
    (from_tier_id is not null) != (from_supplier_id is null)
    or from_tier_id is null
  )
);

comment on table public.supplier_tier_links
  is 'Arêtes du graph supply chain multi-tiers';

-- Index
create index idx_st_account     on public.supplier_tiers(account_id);
create index idx_st_parent      on public.supplier_tiers(parent_supplier_id);
create index idx_st_tier        on public.supplier_tiers(account_id, tier_level);
create index idx_stl_from_s     on public.supplier_tier_links(from_supplier_id);
create index idx_stl_from_t     on public.supplier_tier_links(from_tier_id);
create index idx_stl_to         on public.supplier_tier_links(to_tier_id);

-- RLS
alter table public.supplier_tiers      enable row level security;
alter table public.supplier_tier_links enable row level security;

create policy st_select  on public.supplier_tiers      for select to authenticated using (account_id = auth.uid());
create policy st_insert  on public.supplier_tiers      for insert to authenticated with check (account_id = auth.uid());
create policy stl_select on public.supplier_tier_links for select to authenticated using (account_id = auth.uid());
create policy stl_insert on public.supplier_tier_links for insert to authenticated with check (account_id = auth.uid());

revoke all on public.supplier_tiers, public.supplier_tier_links from authenticated, service_role;
grant select, insert, delete on public.supplier_tiers, public.supplier_tier_links to authenticated, service_role;

-- ── Vue graph complète ────────────────────────────────────────────────────────
create or replace view public.supply_chain_graph as
-- Tier 1 (nos fournisseurs réels)
select
  s.id::text              as node_id,
  1                       as tier_level,
  s.name,
  s.category,
  s.country_code,
  s.country_name,
  s.global_score          as estimated_score,
  s.risk_level            as estimated_risk_level,
  s.is_sole_source        as is_estimated_sole_source,
  s.annual_spend_eur,
  s.criticality           as supply_chain_impact,
  null::text              as ai_rationale,
  null::uuid              as parent_supplier_id,
  s.account_id,
  true                    as is_real
from public.suppliers s
where s.status != 'blacklisted'

union all

-- Tier 2-4 (nœuds IA)
select
  st.id::text,
  st.tier_level,
  st.name,
  st.category,
  st.country_code,
  st.country_name,
  st.estimated_score,
  st.estimated_risk_level,
  st.is_estimated_sole_source,
  null::bigint,
  st.supply_chain_impact,
  st.ai_rationale,
  st.parent_supplier_id,
  st.account_id,
  false
from public.supplier_tiers st;

comment on view public.supply_chain_graph is 'Graph complet Tier 1-4 (réels + inférés IA)';
