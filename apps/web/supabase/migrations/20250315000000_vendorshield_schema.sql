/*
 * ================================================================
 * VendorShield — Migration principale
 * Gestion et anticipation des risques fournisseurs
 * ================================================================
 *
 * Tables créées :
 *   1. suppliers              — Référentiel des fournisseurs
 *   2. supplier_contacts      — Contacts associés aux fournisseurs
 *   3. risk_assessments       — Évaluations de risque par fournisseur
 *   4. risk_dimension_scores  — Scores détaillés par dimension (4 axes)
 *   5. risk_factors           — Critères fins par dimension
 *   6. alerts                 — Alertes déclenchées
 *   7. alert_rules            — Règles de déclenchement configurables
 *   8. documents              — Pièces jointes & documents
 *   9. audit_log              — Journal d'audit complet
 *
 * Toutes les tables sont protégées par RLS (Row Level Security)
 * L'isolation est faite par account_id = auth.uid()
 * ================================================================
 */

-- ================================================================
-- SECTION 1 — TYPES ÉNUMÉRÉS
-- ================================================================

-- Catégories de fournisseurs
create type public.supplier_category as enum (
    'raw_materials',
    'components',
    'logistics',
    'services',
    'technology',
    'energy',
    'chemicals',
    'packaging',
    'maintenance',
    'other'
);

-- Statut d'un fournisseur
create type public.supplier_status as enum (
    'active',
    'under_review',
    'suspended',
    'inactive',
    'blacklisted'
);

-- Niveau de criticité d'un fournisseur pour l'entreprise
create type public.supplier_criticality as enum (
    'critical',
    'high',
    'medium',
    'low'
);

-- Niveau de risque calculé
create type public.risk_level as enum (
    'low',
    'medium',
    'high',
    'critical'
);

-- Statut d'une évaluation
create type public.assessment_status as enum (
    'draft',
    'in_progress',
    'completed',
    'approved',
    'archived'
);

-- Dimensions de risque (4 axes)
create type public.risk_dimension as enum (
    'financial',
    'operational',
    'geopolitical',
    'esg'
);

-- Type d'alerte
create type public.alert_type as enum (
    'score_drop',
    'threshold_breach',
    'new_assessment',
    'document_expiry',
    'manual',
    'system'
);

-- Sévérité d'une alerte
create type public.alert_severity as enum (
    'info',
    'warning',
    'critical'
);

-- Statut d'une alerte
create type public.alert_status as enum (
    'open',
    'acknowledged',
    'resolved',
    'dismissed'
);

-- Type d'action pour l'audit log
create type public.audit_action as enum (
    'create',
    'update',
    'delete',
    'view',
    'export',
    'approve',
    'archive'
);


-- ================================================================
-- SECTION 2 — TABLE : suppliers
-- ================================================================

create table if not exists public.suppliers (
    id                  uuid primary key default extensions.uuid_generate_v4(),
    account_id          uuid not null references public.accounts(id) on delete cascade,

    -- Identité
    name                varchar(255) not null,
    legal_name          varchar(255),
    registration_number varchar(100),
    vat_number          varchar(100),
    website             varchar(500),
    description         text,

    -- Classification
    category            public.supplier_category not null default 'other',
    status              public.supplier_status not null default 'active',
    criticality         public.supplier_criticality not null default 'medium',
    tags                text[] default '{}',

    -- Localisation
    country_code        char(2),                          -- ISO 3166-1 alpha-2
    country_name        varchar(100),
    city                varchar(100),
    address             text,
    region              varchar(100),

    -- Financier
    annual_revenue_eur  bigint,                           -- en euros
    employee_count      integer,
    founded_year        smallint,
    credit_rating       varchar(10),                      -- ex: AA, BBB+, etc.

    -- Relation commerciale
    contract_start_date date,
    contract_end_date   date,
    annual_spend_eur    bigint,                           -- dépense annuelle en €
    spend_percentage    numeric(5,2),                     -- % du CA achat total
    is_sole_source      boolean not null default false,   -- fournisseur unique ?
    payment_terms_days  smallint,                         -- délai de paiement

    -- Scores (dénormalisés pour performance)
    global_score        smallint check (global_score between 0 and 100),
    financial_score     smallint check (financial_score between 0 and 100),
    operational_score   smallint check (operational_score between 0 and 100),
    geopolitical_score  smallint check (geopolitical_score between 0 and 100),
    esg_score           smallint check (esg_score between 0 and 100),
    risk_level          public.risk_level,  -- mis à jour par trigger kit.compute_risk_level
    last_assessed_at    timestamp with time zone,

    -- Métadonnées
    created_at          timestamp with time zone not null default now(),
    updated_at          timestamp with time zone not null default now(),
    created_by          uuid references auth.users(id),
    updated_by          uuid references auth.users(id),
    notes               text,
    metadata            jsonb not null default '{}'::jsonb
);

comment on table public.suppliers is 'Référentiel central des fournisseurs de l''entreprise';
comment on column public.suppliers.global_score is 'Score de risque global de 0 (risque maximal) à 100 (risque minimal)';
comment on column public.suppliers.risk_level is 'Niveau de risque calculé automatiquement depuis global_score';
comment on column public.suppliers.is_sole_source is 'Indique si ce fournisseur est le seul disponible pour ce besoin';
comment on column public.suppliers.spend_percentage is 'Pourcentage de ce fournisseur dans le total des achats';

-- Index pour les requêtes courantes
create index idx_suppliers_account_id on public.suppliers(account_id);
create index idx_suppliers_status on public.suppliers(account_id, status);
create index idx_suppliers_risk_level on public.suppliers(account_id, risk_level);
create index idx_suppliers_category on public.suppliers(account_id, category);
create index idx_suppliers_country on public.suppliers(account_id, country_code);
create index idx_suppliers_global_score on public.suppliers(account_id, global_score);

-- RLS
alter table public.suppliers enable row level security;

create policy suppliers_select on public.suppliers
    for select to authenticated
    using (account_id = (select auth.uid()));

create policy suppliers_insert on public.suppliers
    for insert to authenticated
    with check (account_id = (select auth.uid()));

create policy suppliers_update on public.suppliers
    for update to authenticated
    using (account_id = (select auth.uid()))
    with check (account_id = (select auth.uid()));

create policy suppliers_delete on public.suppliers
    for delete to authenticated
    using (account_id = (select auth.uid()));

-- Grants
revoke all on public.suppliers from authenticated, service_role;
grant select, insert, update, delete on public.suppliers to authenticated, service_role;


-- ================================================================
-- SECTION 3 — TABLE : supplier_contacts
-- ================================================================

create table if not exists public.supplier_contacts (
    id            uuid primary key default extensions.uuid_generate_v4(),
    supplier_id   uuid not null references public.suppliers(id) on delete cascade,
    account_id    uuid not null references public.accounts(id) on delete cascade,

    first_name    varchar(100) not null,
    last_name     varchar(100) not null,
    job_title     varchar(150),
    email         varchar(320),
    phone         varchar(50),
    is_primary    boolean not null default false,
    department    varchar(100),

    created_at    timestamp with time zone not null default now(),
    updated_at    timestamp with time zone not null default now()
);

comment on table public.supplier_contacts is 'Contacts associés à chaque fournisseur';

create index idx_supplier_contacts_supplier on public.supplier_contacts(supplier_id);
create index idx_supplier_contacts_account on public.supplier_contacts(account_id);

alter table public.supplier_contacts enable row level security;

create policy supplier_contacts_select on public.supplier_contacts
    for select to authenticated using (account_id = (select auth.uid()));
create policy supplier_contacts_insert on public.supplier_contacts
    for insert to authenticated with check (account_id = (select auth.uid()));
create policy supplier_contacts_update on public.supplier_contacts
    for update to authenticated using (account_id = (select auth.uid()));
create policy supplier_contacts_delete on public.supplier_contacts
    for delete to authenticated using (account_id = (select auth.uid()));

revoke all on public.supplier_contacts from authenticated, service_role;
grant select, insert, update, delete on public.supplier_contacts to authenticated, service_role;


-- ================================================================
-- SECTION 4 — TABLE : risk_assessments
-- ================================================================

create table if not exists public.risk_assessments (
    id              uuid primary key default extensions.uuid_generate_v4(),
    supplier_id     uuid not null references public.suppliers(id) on delete cascade,
    account_id      uuid not null references public.accounts(id) on delete cascade,

    -- Identification
    title           varchar(255) not null,
    assessment_date date not null default current_date,
    next_review_date date,
    status          public.assessment_status not null default 'draft',
    version         smallint not null default 1,

    -- Scores calculés (0 = risque maximal, 100 = risque minimal)
    global_score        smallint check (global_score between 0 and 100),
    financial_score     smallint check (financial_score between 0 and 100),
    operational_score   smallint check (operational_score between 0 and 100),
    geopolitical_score  smallint check (geopolitical_score between 0 and 100),
    esg_score           smallint check (esg_score between 0 and 100),

    -- Pondérations utilisées (doivent totaliser 100)
    weight_financial    smallint not null default 30 check (weight_financial between 0 and 100),
    weight_operational  smallint not null default 30 check (weight_operational between 0 and 100),
    weight_geopolitical smallint not null default 20 check (weight_geopolitical between 0 and 100),
    weight_esg          smallint not null default 20 check (weight_esg between 0 and 100),

    -- Contexte
    analyst_notes       text,
    executive_summary   text,
    mitigation_plan     text,
    approved_by         uuid references auth.users(id),
    approved_at         timestamp with time zone,

    created_at      timestamp with time zone not null default now(),
    updated_at      timestamp with time zone not null default now(),
    created_by      uuid references auth.users(id),
    updated_by      uuid references auth.users(id)
);

comment on table public.risk_assessments is 'Évaluations de risque réalisées sur les fournisseurs';
comment on column public.risk_assessments.global_score is 'Score global calculé par la fonction compute_assessment_scores()';
comment on column public.risk_assessments.version is 'Numéro de version de l''évaluation, incrémenté à chaque mise à jour majeure';

create index idx_risk_assessments_supplier on public.risk_assessments(supplier_id);
create index idx_risk_assessments_account on public.risk_assessments(account_id);
create index idx_risk_assessments_status on public.risk_assessments(account_id, status);
create index idx_risk_assessments_date on public.risk_assessments(account_id, assessment_date desc);

alter table public.risk_assessments enable row level security;

create policy risk_assessments_select on public.risk_assessments
    for select to authenticated using (account_id = (select auth.uid()));
create policy risk_assessments_insert on public.risk_assessments
    for insert to authenticated with check (account_id = (select auth.uid()));
create policy risk_assessments_update on public.risk_assessments
    for update to authenticated using (account_id = (select auth.uid()));
create policy risk_assessments_delete on public.risk_assessments
    for delete to authenticated using (account_id = (select auth.uid()));

revoke all on public.risk_assessments from authenticated, service_role;
grant select, insert, update, delete on public.risk_assessments to authenticated, service_role;


-- ================================================================
-- SECTION 5 — TABLE : risk_factors
-- Critères granulaires par dimension d'une évaluation
-- ================================================================

create table if not exists public.risk_factors (
    id              uuid primary key default extensions.uuid_generate_v4(),
    assessment_id   uuid not null references public.risk_assessments(id) on delete cascade,
    account_id      uuid not null references public.accounts(id) on delete cascade,

    dimension       public.risk_dimension not null,
    factor_key      varchar(100) not null,     -- ex: 'payment_delays', 'carbon_footprint'
    factor_label    varchar(255) not null,     -- ex: 'Retards de paiement'
    score           smallint not null check (score between 0 and 100),
    weight          smallint not null default 1 check (weight between 1 and 10),
    evidence        text,                      -- justification / sources
    data_source     varchar(255),              -- d'où vient la donnée

    created_at      timestamp with time zone not null default now(),
    updated_at      timestamp with time zone not null default now()
);

comment on table public.risk_factors is 'Critères fins d''évaluation par dimension de risque';
comment on column public.risk_factors.factor_key is 'Identifiant technique du critère, stable entre versions';
comment on column public.risk_factors.weight is 'Poids relatif du critère dans le calcul du score de dimension (1=minimal, 10=maximal)';

create index idx_risk_factors_assessment on public.risk_factors(assessment_id);
create index idx_risk_factors_dimension on public.risk_factors(assessment_id, dimension);
create index idx_risk_factors_account on public.risk_factors(account_id);

alter table public.risk_factors enable row level security;

create policy risk_factors_select on public.risk_factors
    for select to authenticated using (account_id = (select auth.uid()));
create policy risk_factors_insert on public.risk_factors
    for insert to authenticated with check (account_id = (select auth.uid()));
create policy risk_factors_update on public.risk_factors
    for update to authenticated using (account_id = (select auth.uid()));
create policy risk_factors_delete on public.risk_factors
    for delete to authenticated using (account_id = (select auth.uid()));

revoke all on public.risk_factors from authenticated, service_role;
grant select, insert, update, delete on public.risk_factors to authenticated, service_role;


-- ================================================================
-- SECTION 6 — TABLE : alert_rules
-- Règles configurables de déclenchement d'alertes
-- ================================================================

create table if not exists public.alert_rules (
    id              uuid primary key default extensions.uuid_generate_v4(),
    account_id      uuid not null references public.accounts(id) on delete cascade,

    name            varchar(255) not null,
    description     text,
    is_active       boolean not null default true,

    -- Conditions
    dimension       public.risk_dimension,               -- null = score global
    operator        varchar(10) not null default '<'     -- '<', '<=', '>', '>='
        check (operator in ('<', '<=', '>', '>=')),
    threshold       smallint not null check (threshold between 0 and 100),
    severity        public.alert_severity not null default 'warning',

    -- Filtre optionnel
    applies_to_category public.supplier_category,       -- null = tous
    applies_to_criticality public.supplier_criticality, -- null = tous

    -- Notification
    notify_email    boolean not null default true,

    created_at      timestamp with time zone not null default now(),
    updated_at      timestamp with time zone not null default now(),
    created_by      uuid references auth.users(id)
);

comment on table public.alert_rules is 'Règles configurables pour le déclenchement automatique d''alertes';

create index idx_alert_rules_account on public.alert_rules(account_id);
create index idx_alert_rules_active on public.alert_rules(account_id, is_active);

alter table public.alert_rules enable row level security;

create policy alert_rules_select on public.alert_rules
    for select to authenticated using (account_id = (select auth.uid()));
create policy alert_rules_insert on public.alert_rules
    for insert to authenticated with check (account_id = (select auth.uid()));
create policy alert_rules_update on public.alert_rules
    for update to authenticated using (account_id = (select auth.uid()));
create policy alert_rules_delete on public.alert_rules
    for delete to authenticated using (account_id = (select auth.uid()));

revoke all on public.alert_rules from authenticated, service_role;
grant select, insert, update, delete on public.alert_rules to authenticated, service_role;


-- ================================================================
-- SECTION 7 — TABLE : alerts
-- ================================================================

create table if not exists public.alerts (
    id              uuid primary key default extensions.uuid_generate_v4(),
    account_id      uuid not null references public.accounts(id) on delete cascade,
    supplier_id     uuid references public.suppliers(id) on delete set null,
    assessment_id   uuid references public.risk_assessments(id) on delete set null,
    rule_id         uuid references public.alert_rules(id) on delete set null,

    type            public.alert_type not null,
    severity        public.alert_severity not null default 'warning',
    status          public.alert_status not null default 'open',

    title           varchar(255) not null,
    message         text not null,
    context         jsonb not null default '{}'::jsonb,  -- données supplémentaires

    -- Score snapshot au moment de l'alerte
    score_snapshot  smallint,
    score_delta     smallint,                            -- variation vs score précédent

    -- Traitement
    acknowledged_by uuid references auth.users(id),
    acknowledged_at timestamp with time zone,
    resolved_by     uuid references auth.users(id),
    resolved_at     timestamp with time zone,
    resolution_note text,

    created_at      timestamp with time zone not null default now(),
    updated_at      timestamp with time zone not null default now()
);

comment on table public.alerts is 'Alertes déclenchées manuellement ou automatiquement sur les fournisseurs';
comment on column public.alerts.score_delta is 'Variation du score par rapport à l''évaluation précédente (négatif = dégradation)';
comment on column public.alerts.context is 'Données contextuelles supplémentaires au format JSON (ex: valeurs ayant déclenché l''alerte)';

create index idx_alerts_account on public.alerts(account_id);
create index idx_alerts_supplier on public.alerts(supplier_id);
create index idx_alerts_status on public.alerts(account_id, status);
create index idx_alerts_severity on public.alerts(account_id, severity);
create index idx_alerts_created on public.alerts(account_id, created_at desc);

alter table public.alerts enable row level security;

create policy alerts_select on public.alerts
    for select to authenticated using (account_id = (select auth.uid()));
create policy alerts_insert on public.alerts
    for insert to authenticated with check (account_id = (select auth.uid()));
create policy alerts_update on public.alerts
    for update to authenticated using (account_id = (select auth.uid()));
create policy alerts_delete on public.alerts
    for delete to authenticated using (account_id = (select auth.uid()));

revoke all on public.alerts from authenticated, service_role;
grant select, insert, update, delete on public.alerts to authenticated, service_role;


-- ================================================================
-- SECTION 8 — TABLE : documents
-- ================================================================

create table if not exists public.documents (
    id              uuid primary key default extensions.uuid_generate_v4(),
    account_id      uuid not null references public.accounts(id) on delete cascade,
    supplier_id     uuid references public.suppliers(id) on delete cascade,
    assessment_id   uuid references public.risk_assessments(id) on delete cascade,

    name            varchar(255) not null,
    description     text,
    file_path       varchar(1000) not null,              -- chemin Supabase Storage
    file_size_bytes integer,
    mime_type       varchar(100),
    document_type   varchar(100),                        -- ex: 'certification', 'audit_report'

    -- Validité
    issued_date     date,
    expiry_date     date,
    is_expired      boolean not null default false,  -- mis à jour par trigger kit.compute_is_expired

    uploaded_by     uuid references auth.users(id),
    created_at      timestamp with time zone not null default now(),
    updated_at      timestamp with time zone not null default now(),

    constraint documents_has_parent check (
        supplier_id is not null or assessment_id is not null
    )
);

comment on table public.documents is 'Documents et pièces jointes liés aux fournisseurs et évaluations';
comment on column public.documents.is_expired is 'Calculé automatiquement selon expiry_date';

create index idx_documents_account on public.documents(account_id);
create index idx_documents_supplier on public.documents(supplier_id);
create index idx_documents_assessment on public.documents(assessment_id);
create index idx_documents_expiry on public.documents(account_id, expiry_date) where expiry_date is not null;

alter table public.documents enable row level security;

create policy documents_select on public.documents
    for select to authenticated using (account_id = (select auth.uid()));
create policy documents_insert on public.documents
    for insert to authenticated with check (account_id = (select auth.uid()));
create policy documents_update on public.documents
    for update to authenticated using (account_id = (select auth.uid()));
create policy documents_delete on public.documents
    for delete to authenticated using (account_id = (select auth.uid()));

revoke all on public.documents from authenticated, service_role;
grant select, insert, update, delete on public.documents to authenticated, service_role;


-- ================================================================
-- SECTION 9 — TABLE : audit_log
-- ================================================================

create table if not exists public.audit_log (
    id              uuid primary key default extensions.uuid_generate_v4(),
    account_id      uuid not null references public.accounts(id) on delete cascade,
    user_id         uuid references auth.users(id),

    action          public.audit_action not null,
    entity_type     varchar(50) not null,                -- 'supplier', 'assessment', etc.
    entity_id       uuid,
    entity_name     varchar(255),

    changes         jsonb,                               -- {before: {...}, after: {...}}
    ip_address      inet,
    user_agent      text,

    created_at      timestamp with time zone not null default now()
);

comment on table public.audit_log is 'Journal d''audit de toutes les actions sur les données VendorShield';
comment on column public.audit_log.changes is 'Snapshot JSON des données avant/après modification';

create index idx_audit_log_account on public.audit_log(account_id);
create index idx_audit_log_entity on public.audit_log(entity_type, entity_id);
create index idx_audit_log_user on public.audit_log(account_id, user_id);
create index idx_audit_log_created on public.audit_log(account_id, created_at desc);

alter table public.audit_log enable row level security;

create policy audit_log_select on public.audit_log
    for select to authenticated using (account_id = (select auth.uid()));
create policy audit_log_insert on public.audit_log
    for insert to authenticated with check (account_id = (select auth.uid()));
-- Pas de UPDATE ni DELETE sur l'audit log (immuable)

revoke all on public.audit_log from authenticated, service_role;
grant select, insert on public.audit_log to authenticated, service_role;


-- ================================================================
-- SECTION 10 — FONCTIONS MÉTIER
-- ================================================================

-- ----------------------------------------------------------------
-- Fonction : compute_assessment_scores()
-- Calcule les scores par dimension et le score global
-- à partir des risk_factors de l'évaluation
-- ----------------------------------------------------------------
create or replace function public.compute_assessment_scores(p_assessment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_financial_score     numeric;
    v_operational_score   numeric;
    v_geopolitical_score  numeric;
    v_esg_score           numeric;
    v_global_score        numeric;
    v_weight_fin          smallint;
    v_weight_ops          smallint;
    v_weight_geo          smallint;
    v_weight_esg          smallint;
begin
    -- Scores par dimension (moyenne pondérée des facteurs)
    select
        coalesce(
            sum(score * weight) filter (where dimension = 'financial')::numeric /
            nullif(sum(weight) filter (where dimension = 'financial'), 0),
            null
        ),
        coalesce(
            sum(score * weight) filter (where dimension = 'operational')::numeric /
            nullif(sum(weight) filter (where dimension = 'operational'), 0),
            null
        ),
        coalesce(
            sum(score * weight) filter (where dimension = 'geopolitical')::numeric /
            nullif(sum(weight) filter (where dimension = 'geopolitical'), 0),
            null
        ),
        coalesce(
            sum(score * weight) filter (where dimension = 'esg')::numeric /
            nullif(sum(weight) filter (where dimension = 'esg'), 0),
            null
        )
    into
        v_financial_score,
        v_operational_score,
        v_geopolitical_score,
        v_esg_score
    from public.risk_factors
    where assessment_id = p_assessment_id;

    -- Récupérer les pondérations de l'évaluation
    select weight_financial, weight_operational, weight_geopolitical, weight_esg
    into v_weight_fin, v_weight_ops, v_weight_geo, v_weight_esg
    from public.risk_assessments
    where id = p_assessment_id;

    -- Score global (moyenne pondérée des 4 dimensions)
    if v_financial_score is not null or v_operational_score is not null
        or v_geopolitical_score is not null or v_esg_score is not null
    then
        v_global_score :=
            (coalesce(v_financial_score, 0) * v_weight_fin +
             coalesce(v_operational_score, 0) * v_weight_ops +
             coalesce(v_geopolitical_score, 0) * v_weight_geo +
             coalesce(v_esg_score, 0) * v_weight_esg) /
            (case when v_financial_score is not null then v_weight_fin else 0 end +
             case when v_operational_score is not null then v_weight_ops else 0 end +
             case when v_geopolitical_score is not null then v_weight_geo else 0 end +
             case when v_esg_score is not null then v_weight_esg else 0 end);
    end if;

    -- Mise à jour de l'évaluation
    update public.risk_assessments
    set
        financial_score     = round(v_financial_score)::smallint,
        operational_score   = round(v_operational_score)::smallint,
        geopolitical_score  = round(v_geopolitical_score)::smallint,
        esg_score           = round(v_esg_score)::smallint,
        global_score        = round(v_global_score)::smallint,
        updated_at          = now()
    where id = p_assessment_id;
end;
$$;

grant execute on function public.compute_assessment_scores(uuid) to authenticated, service_role;


-- ----------------------------------------------------------------
-- Fonction : sync_supplier_scores()
-- Après une évaluation approuvée, met à jour les scores
-- dénormalisés du fournisseur
-- ----------------------------------------------------------------
create or replace function public.sync_supplier_scores()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_previous_global smallint;
begin
    -- Ne synchroniser que sur les évaluations passant à "completed" ou "approved"
    if new.status not in ('completed', 'approved') then
        return new;
    end if;

    if new.global_score is null then
        return new;
    end if;

    -- Récupérer le score précédent du fournisseur
    select global_score into v_previous_global
    from public.suppliers
    where id = new.supplier_id;

    -- Mettre à jour le fournisseur
    update public.suppliers
    set
        global_score        = new.global_score,
        financial_score     = new.financial_score,
        operational_score   = new.operational_score,
        geopolitical_score  = new.geopolitical_score,
        esg_score           = new.esg_score,
        last_assessed_at    = now(),
        updated_at          = now()
    where id = new.supplier_id;

    -- Déclencher une alerte si le score a chuté de plus de 10 points
    if v_previous_global is not null
       and new.global_score < v_previous_global
       and (v_previous_global - new.global_score) >= 10
    then
        insert into public.alerts (
            account_id, supplier_id, assessment_id,
            type, severity, title, message,
            score_snapshot, score_delta
        )
        select
            new.account_id,
            new.supplier_id,
            new.id,
            'score_drop',
            case
                when (v_previous_global - new.global_score) >= 25 then 'critical'
                when (v_previous_global - new.global_score) >= 15 then 'warning'
                else 'info'
            end,
            'Dégradation du score de risque',
            format(
                'Le score global du fournisseur a chuté de %s points (%s → %s)',
                v_previous_global - new.global_score,
                v_previous_global,
                new.global_score
            ),
            new.global_score,
            new.global_score - v_previous_global;
    end if;

    return new;
end;
$$;

create trigger trigger_sync_supplier_scores
    after update of status, global_score
    on public.risk_assessments
    for each row
execute function public.sync_supplier_scores();


-- ----------------------------------------------------------------
-- Fonction : check_alert_rules()
-- Vérifie les règles d'alerte après chaque mise à jour de score
-- ----------------------------------------------------------------
create or replace function public.check_alert_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_rule    record;
    v_score   smallint;
begin
    -- Pour chaque règle active de ce compte
    for v_rule in
        select * from public.alert_rules
        where account_id = new.account_id
          and is_active = true
          and (applies_to_category is null or applies_to_category = new.category)
          and (applies_to_criticality is null or applies_to_criticality = new.criticality)
    loop
        -- Déterminer le score à évaluer selon la dimension
        v_score := case v_rule.dimension
            when 'financial'    then new.financial_score
            when 'operational'  then new.operational_score
            when 'geopolitical' then new.geopolitical_score
            when 'esg'          then new.esg_score
            else new.global_score
        end;

        if v_score is null then
            continue;
        end if;

        -- Évaluer la condition
        if (v_rule.operator = '<'  and v_score <  v_rule.threshold) or
           (v_rule.operator = '<=' and v_score <= v_rule.threshold) or
           (v_rule.operator = '>'  and v_score >  v_rule.threshold) or
           (v_rule.operator = '>=' and v_score >= v_rule.threshold)
        then
            -- Vérifier qu'une alerte identique ouverte n'existe pas déjà
            if not exists (
                select 1 from public.alerts
                where supplier_id = new.id
                  and rule_id = v_rule.id
                  and status = 'open'
            ) then
                insert into public.alerts (
                    account_id, supplier_id, rule_id,
                    type, severity, title, message, score_snapshot
                ) values (
                    new.account_id,
                    new.id,
                    v_rule.id,
                    'threshold_breach',
                    v_rule.severity,
                    format('Seuil d''alerte déclenché : %s', v_rule.name),
                    format(
                        'Le score %s (%s) est %s %s pour le fournisseur %s',
                        coalesce(v_rule.dimension::text, 'global'),
                        v_score,
                        v_rule.operator,
                        v_rule.threshold,
                        new.name
                    ),
                    v_score
                );
            end if;
        end if;
    end loop;

    return new;
end;
$$;

create trigger trigger_check_alert_rules
    after update of global_score, financial_score, operational_score,
                    geopolitical_score, esg_score
    on public.suppliers
    for each row
execute function public.check_alert_rules();


-- ----------------------------------------------------------------
-- Fonction : kit.compute_risk_level()
-- Calcule risk_level depuis global_score (remplace colonne générée)
-- ----------------------------------------------------------------
create or replace function kit.compute_risk_level()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.risk_level :=
        case
            when new.global_score is null  then null
            when new.global_score >= 70    then 'low'::public.risk_level
            when new.global_score >= 40    then 'medium'::public.risk_level
            when new.global_score >= 20    then 'high'::public.risk_level
            else                                'critical'::public.risk_level
        end;
    return new;
end;
$$;

create trigger compute_risk_level
    before insert or update of global_score
    on public.suppliers
    for each row
execute function kit.compute_risk_level();

-- ----------------------------------------------------------------
-- Fonction : kit.compute_is_expired()
-- Calcule is_expired depuis expiry_date (remplace colonne générée)
-- ----------------------------------------------------------------
create or replace function kit.compute_is_expired()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.is_expired := (
        new.expiry_date is not null
        and new.expiry_date < current_date
    );
    return new;
end;
$$;

create trigger compute_is_expired
    before insert or update of expiry_date
    on public.documents
    for each row
execute function kit.compute_is_expired();

-- ----------------------------------------------------------------
-- Fonction : update_updated_at()
-- Trigger générique pour maintenir updated_at à jour
-- ----------------------------------------------------------------
create or replace function kit.update_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- Appliquer le trigger updated_at sur toutes les tables
create trigger set_updated_at before update on public.suppliers
    for each row execute function kit.update_updated_at();
create trigger set_updated_at before update on public.supplier_contacts
    for each row execute function kit.update_updated_at();
create trigger set_updated_at before update on public.risk_assessments
    for each row execute function kit.update_updated_at();
create trigger set_updated_at before update on public.risk_factors
    for each row execute function kit.update_updated_at();
create trigger set_updated_at before update on public.alert_rules
    for each row execute function kit.update_updated_at();
create trigger set_updated_at before update on public.alerts
    for each row execute function kit.update_updated_at();
create trigger set_updated_at before update on public.documents
    for each row execute function kit.update_updated_at();


-- ================================================================
-- SECTION 11 — VUES ANALYTIQUES
-- ================================================================

-- Vue : résumé des risques par fournisseur (lecture seule)
create or replace view public.supplier_risk_summary as
select
    s.id,
    s.account_id,
    s.name,
    s.category,
    s.status,
    s.criticality,
    s.country_code,
    s.country_name,
    s.global_score,
    s.financial_score,
    s.operational_score,
    s.geopolitical_score,
    s.esg_score,
    s.risk_level,
    s.is_sole_source,
    s.last_assessed_at,
    s.annual_spend_eur,
    s.spend_percentage,
    count(distinct ra.id) filter (where ra.status = 'completed') as completed_assessments,
    count(distinct a.id) filter (where a.status = 'open') as open_alerts,
    count(distinct a.id) filter (where a.status = 'open' and a.severity = 'critical') as critical_alerts,
    max(ra.assessment_date) as last_assessment_date
from public.suppliers s
left join public.risk_assessments ra on ra.supplier_id = s.id
left join public.alerts a on a.supplier_id = s.id
group by s.id;

comment on view public.supplier_risk_summary is 'Vue consolidée des risques fournisseurs avec compteurs d''alertes et d''évaluations';

-- Vue : tableau de bord compte (KPIs globaux)
create or replace view public.account_risk_dashboard as
select
    s.account_id,
    count(distinct s.id) as total_suppliers,
    count(distinct s.id) filter (where s.status = 'active') as active_suppliers,
    round(avg(s.global_score)) as avg_global_score,
    round(avg(s.financial_score)) as avg_financial_score,
    round(avg(s.operational_score)) as avg_operational_score,
    round(avg(s.geopolitical_score)) as avg_geopolitical_score,
    round(avg(s.esg_score)) as avg_esg_score,
    count(*) filter (where s.risk_level = 'critical') as critical_risk_count,
    count(*) filter (where s.risk_level = 'high') as high_risk_count,
    count(*) filter (where s.risk_level = 'medium') as medium_risk_count,
    count(*) filter (where s.risk_level = 'low') as low_risk_count,
    count(*) filter (where s.is_sole_source = true) as sole_source_count,
    count(distinct a.id) filter (where a.status = 'open') as open_alerts_total,
    count(distinct a.id) filter (where a.status = 'open' and a.severity = 'critical') as critical_alerts_total
from public.suppliers s
left join public.alerts a on a.supplier_id = s.id and a.account_id = s.account_id
where s.status != 'blacklisted'
group by s.account_id;

comment on view public.account_risk_dashboard is 'KPIs agrégés par compte pour le tableau de bord principal';

-- RLS sur les vues via les politiques des tables sous-jacentes
-- (les vues héritent automatiquement du RLS des tables)


-- ================================================================
-- SECTION 12 — STORAGE BUCKET pour les documents
-- ================================================================

-- Créer le bucket vendor_documents
-- Compatible CLI locale (colonnes de base) ET Supabase Cloud (config complète)
insert into storage.buckets (id, name, public)
values ('vendor_documents', 'vendor_documents', false)
on conflict (id) do nothing;

-- Appliquer file_size_limit et allowed_mime_types uniquement si ces colonnes existent
-- (disponibles sur Supabase Cloud et CLI >= 1.170, ignorées en local sur anciennes versions)
do $$
begin
    if exists (
        select 1 from information_schema.columns
        where table_schema = 'storage'
          and table_name   = 'buckets'
          and column_name  = 'file_size_limit'
    ) then
        update storage.buckets
        set file_size_limit = 52428800  -- 50 MB
        where id = 'vendor_documents';
    end if;

    if exists (
        select 1 from information_schema.columns
        where table_schema = 'storage'
          and table_name   = 'buckets'
          and column_name  = 'allowed_mime_types'
    ) then
        update storage.buckets
        set allowed_mime_types = array[
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/webp',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'text/csv'
        ]
        where id = 'vendor_documents';
    end if;
end $$;

-- Politique RLS storage : chaque user accède uniquement à ses documents
-- Format du chemin attendu : {account_id}/{supplier_id}/{filename}
create policy vendor_documents_select on storage.objects
    for select to authenticated
    using (
        bucket_id = 'vendor_documents'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

create policy vendor_documents_insert on storage.objects
    for insert to authenticated
    with check (
        bucket_id = 'vendor_documents'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

create policy vendor_documents_update on storage.objects
    for update to authenticated
    using (
        bucket_id = 'vendor_documents'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

create policy vendor_documents_delete on storage.objects
    for delete to authenticated
    using (
        bucket_id = 'vendor_documents'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );


-- ================================================================
-- SECTION 13 — DONNÉES DE RÉFÉRENCE : facteurs par défaut
-- ================================================================

-- Fonction pour insérer les facteurs de risque par défaut
-- lors de la création d'une nouvelle évaluation
create or replace function public.seed_default_risk_factors(
    p_assessment_id uuid,
    p_account_id    uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.risk_factors
        (assessment_id, account_id, dimension, factor_key, factor_label, weight, score)
    values
        -- DIMENSION FINANCIÈRE (poids total: 30%)
        (p_assessment_id, p_account_id, 'financial', 'credit_rating',      'Notation de crédit & solvabilité',       3, 50),
        (p_assessment_id, p_account_id, 'financial', 'payment_delays',     'Historique de retards de paiement',      2, 50),
        (p_assessment_id, p_account_id, 'financial', 'revenue_stability',  'Stabilité du chiffre d''affaires',       2, 50),
        (p_assessment_id, p_account_id, 'financial', 'debt_ratio',         'Niveau d''endettement',                  2, 50),
        (p_assessment_id, p_account_id, 'financial', 'customer_concentration', 'Concentration client (dépendance)',  2, 50),
        (p_assessment_id, p_account_id, 'financial', 'profitability',      'Rentabilité & marges',                   2, 50),

        -- DIMENSION OPÉRATIONNELLE (poids total: 30%)
        (p_assessment_id, p_account_id, 'operational', 'delivery_reliability', 'Fiabilité des délais de livraison',  3, 50),
        (p_assessment_id, p_account_id, 'operational', 'quality_certifications', 'Certifications qualité (ISO, etc.)', 3, 50),
        (p_assessment_id, p_account_id, 'operational', 'capacity_flexibility', 'Flexibilité et capacité de production', 2, 50),
        (p_assessment_id, p_account_id, 'operational', 'substitutability',  'Facilité de substitution fournisseur',  3, 50),
        (p_assessment_id, p_account_id, 'operational', 'it_security',       'Sécurité informatique & cyber-risques', 2, 50),
        (p_assessment_id, p_account_id, 'operational', 'bcp_existence',     'Plan de continuité d''activité (BCP)',  2, 50),
        (p_assessment_id, p_account_id, 'operational', 'subcontractor_risk','Risque sous-traitants',                 2, 50),

        -- DIMENSION GÉOPOLITIQUE (poids total: 20%)
        (p_assessment_id, p_account_id, 'geopolitical', 'country_risk',     'Indice de risque pays (stabilité)',     4, 50),
        (p_assessment_id, p_account_id, 'geopolitical', 'sanctions_exposure','Exposition aux sanctions & embargos',  4, 50),
        (p_assessment_id, p_account_id, 'geopolitical', 'trade_restrictions','Restrictions commerciales & douanières', 3, 50),
        (p_assessment_id, p_account_id, 'geopolitical', 'currency_risk',    'Risque de change',                      2, 50),
        (p_assessment_id, p_account_id, 'geopolitical', 'infrastructure',   'Qualité infrastructures transport/énergie', 2, 50),

        -- DIMENSION ESG / CONFORMITÉ (poids total: 20%)
        (p_assessment_id, p_account_id, 'esg', 'carbon_footprint',          'Empreinte carbone & politique climat',  3, 50),
        (p_assessment_id, p_account_id, 'esg', 'labor_practices',           'Conditions & pratiques de travail',     3, 50),
        (p_assessment_id, p_account_id, 'esg', 'human_rights',              'Droits humains (devoir de vigilance)',  3, 50),
        (p_assessment_id, p_account_id, 'esg', 'corruption_bribery',        'Anti-corruption & conformité légale',   3, 50),
        (p_assessment_id, p_account_id, 'esg', 'environmental_compliance',  'Conformité environnementale réglementaire', 2, 50),
        (p_assessment_id, p_account_id, 'esg', 'data_privacy',              'Protection des données (RGPD)',         2, 50);
end;
$$;

grant execute on function public.seed_default_risk_factors(uuid, uuid) to authenticated, service_role;

-- ================================================================
-- FIN DE LA MIGRATION VendorShield
-- ================================================================