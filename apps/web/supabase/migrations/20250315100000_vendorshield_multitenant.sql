/*
 * ================================================================
 * VendorShield — Multi-tenant + Risk Intelligence Engine Couche 1
 * ================================================================
 * ORDRE D'EXÉCUTION :
 *   1. Types énumérés
 *   2. Création de TOUTES les tables (sans policies)
 *   3. Fonctions helpers RLS (is_org_member, my_org_ids)
 *   4. TOUTES les policies RLS (après que toutes les tables existent)
 *   5. Grants
 *   6. Ajout org_id sur tables VendorShield + migration policies
 *   7. Risk Intelligence Engine : catalogue + templates + profils
 *   8. Données système (templates par défaut, catalogue indicateurs)
 *   9. Fonction onboarding create_organization()
 *  10. Triggers updated_at
 * ================================================================
 */


-- ================================================================
-- SECTION 1 — TYPES ÉNUMÉRÉS
-- ================================================================

create type public.org_member_role as enum (
    'owner', 'admin', 'analyst', 'viewer', 'auditor'
);

create type public.invite_status as enum (
    'pending', 'accepted', 'expired', 'revoked'
);

create type public.sso_provider_type as enum (
    'saml', 'oidc', 'google_workspace', 'microsoft_entra', 'okta'
);


-- ================================================================
-- SECTION 2 — CRÉATION DES TABLES (sans RLS policies)
-- ================================================================

-- ── organizations ─────────────────────────────────────────────

create table if not exists public.organizations (
    id                      uuid primary key default extensions.uuid_generate_v4(),
    name                    varchar(255) not null,
    slug                    varchar(100) unique not null,
    logo_url                varchar(1000),
    website                 varchar(500),
    description             text,
    industry                varchar(100),
    company_size            varchar(20) check (company_size in (
                                '1-10','11-50','51-200','201-1000','1001-5000','5000+'
                            )),
    country_code            char(2),
    settings                jsonb not null default '{}'::jsonb,
    plan                    varchar(20) not null default 'starter'
                                check (plan in ('starter','pro','enterprise','trial')),
    plan_expires_at         timestamp with time zone,
    stripe_customer_id      varchar(100),
    stripe_subscription_id  varchar(100),
    max_suppliers           integer not null default 25,
    max_members             integer not null default 1,
    features_json           jsonb not null default '{}'::jsonb,
    created_at              timestamp with time zone not null default now(),
    updated_at              timestamp with time zone not null default now(),
    created_by              uuid references auth.users(id)
);

create index idx_organizations_slug       on public.organizations(slug);
create index idx_organizations_plan       on public.organizations(plan);
create index idx_organizations_created_by on public.organizations(created_by);

-- ── org_members ───────────────────────────────────────────────

create table if not exists public.org_members (
    id                          uuid primary key default extensions.uuid_generate_v4(),
    org_id                      uuid not null references public.organizations(id) on delete cascade,
    user_id                     uuid not null references auth.users(id) on delete cascade,
    role                        public.org_member_role not null default 'viewer',
    status                      varchar(20) not null default 'active'
                                    check (status in ('active','suspended','left')),
    can_export                  boolean not null default true,
    can_approve_assessments     boolean not null default false,
    can_manage_alert_rules      boolean not null default false,
    can_configure_weights       boolean not null default false,
    invited_by                  uuid references auth.users(id),
    joined_at                   timestamp with time zone default now(),
    last_active_at              timestamp with time zone,
    created_at                  timestamp with time zone not null default now(),
    updated_at                  timestamp with time zone not null default now(),
    unique (org_id, user_id)
);

create index idx_org_members_org  on public.org_members(org_id);
create index idx_org_members_user on public.org_members(user_id);
create index idx_org_members_role on public.org_members(org_id, role);

-- ── org_invitations ───────────────────────────────────────────

create table if not exists public.org_invitations (
    id          uuid primary key default extensions.uuid_generate_v4(),
    org_id      uuid not null references public.organizations(id) on delete cascade,
    email       varchar(320) not null,
    role        public.org_member_role not null default 'viewer',
    token       varchar(100) unique not null
                    default encode(extensions.gen_random_bytes(32), 'hex'),
    status      public.invite_status not null default 'pending',
    invited_by  uuid references auth.users(id),
    accepted_by uuid references auth.users(id),
    expires_at  timestamp with time zone not null default (now() + interval '7 days'),
    accepted_at timestamp with time zone,
    created_at  timestamp with time zone not null default now()
);

create index idx_org_invitations_org   on public.org_invitations(org_id);
create index idx_org_invitations_token on public.org_invitations(token);
create index idx_org_invitations_email on public.org_invitations(email);

-- ── sso_configurations ────────────────────────────────────────

create table if not exists public.sso_configurations (
    id                  uuid primary key default extensions.uuid_generate_v4(),
    org_id              uuid not null unique references public.organizations(id) on delete cascade,
    provider_type       public.sso_provider_type not null,
    is_active           boolean not null default false,
    is_required         boolean not null default false,
    provider_config     jsonb not null default '{}'::jsonb,
    attribute_mapping   jsonb not null default '{}'::jsonb,
    allowed_domains     text[] not null default '{}',
    tested_at           timestamp with time zone,
    created_at          timestamp with time zone not null default now(),
    updated_at          timestamp with time zone not null default now(),
    configured_by       uuid references auth.users(id)
);

-- ── risk_indicator_catalog ────────────────────────────────────

create table if not exists public.risk_indicator_catalog (
    id                uuid primary key default extensions.uuid_generate_v4(),
    dimension         public.risk_dimension not null,
    key               varchar(100) not null unique,
    label_fr          varchar(255) not null,
    label_en          varchar(255) not null,
    description_fr    text,
    description_en    text,
    default_weight    smallint not null default 5
                          check (default_weight between 1 and 10),
    is_required       boolean not null default false,
    is_qualitative    boolean not null default false,
    scoring_guide     jsonb,
    data_source_type  varchar(50),
    api_field_path    varchar(255),
    available_on      text[] not null default array['starter','pro','enterprise'],
    sort_order        smallint not null default 99,
    created_at        timestamp with time zone not null default now()
);

create index idx_indicator_catalog_dimension on public.risk_indicator_catalog(dimension);

-- ── scoring_templates ─────────────────────────────────────────

create table if not exists public.scoring_templates (
    id                    uuid primary key default extensions.uuid_generate_v4(),
    org_id                uuid references public.organizations(id) on delete cascade,
    name                  varchar(255) not null,
    description           text,
    industry              varchar(100),
    is_system             boolean not null default false,
    is_default            boolean not null default false,
    weight_financial      smallint not null default 30 check (weight_financial between 0 and 100),
    weight_operational    smallint not null default 30 check (weight_operational between 0 and 100),
    weight_geopolitical   smallint not null default 20 check (weight_geopolitical between 0 and 100),
    weight_esg            smallint not null default 20 check (weight_esg between 0 and 100),
    usage_count           integer not null default 0,
    last_used_at          timestamp with time zone,
    created_at            timestamp with time zone not null default now(),
    updated_at            timestamp with time zone not null default now(),
    created_by            uuid references auth.users(id),
    constraint weights_sum_100 check (
        weight_financial + weight_operational + weight_geopolitical + weight_esg = 100
    )
);

create index idx_scoring_templates_org    on public.scoring_templates(org_id);
create index idx_scoring_templates_system on public.scoring_templates(is_system)
    where is_system = true;

-- ── template_indicators ───────────────────────────────────────

create table if not exists public.template_indicators (
    id              uuid primary key default extensions.uuid_generate_v4(),
    template_id     uuid not null references public.scoring_templates(id) on delete cascade,
    indicator_key   varchar(100) not null references public.risk_indicator_catalog(key),
    weight          smallint not null default 5 check (weight between 1 and 10),
    is_active       boolean not null default true,
    custom_label    varchar(255),
    custom_guide    jsonb,
    created_at      timestamp with time zone not null default now(),
    unique (template_id, indicator_key)
);

create index idx_template_indicators_template on public.template_indicators(template_id);

-- ── weight_profiles ───────────────────────────────────────────

create table if not exists public.weight_profiles (
    id                      uuid primary key default extensions.uuid_generate_v4(),
    org_id                  uuid not null references public.organizations(id) on delete cascade,
    name                    varchar(255) not null,
    description             text,
    based_on_template_id    uuid references public.scoring_templates(id),
    weight_financial        smallint not null default 30,
    weight_operational      smallint not null default 30,
    weight_geopolitical     smallint not null default 20,
    weight_esg              smallint not null default 20,
    indicator_weights       jsonb not null default '{}'::jsonb,
    indicator_active        jsonb not null default '{}'::jsonb,
    is_default              boolean not null default false,
    version                 smallint not null default 1,
    parent_id               uuid references public.weight_profiles(id),
    created_at              timestamp with time zone not null default now(),
    updated_at              timestamp with time zone not null default now(),
    created_by              uuid references auth.users(id),
    constraint weight_profile_sum_100 check (
        weight_financial + weight_operational + weight_geopolitical + weight_esg = 100
    )
);

create index idx_weight_profiles_org on public.weight_profiles(org_id);

-- ── assessment_weight_config ──────────────────────────────────

create table if not exists public.assessment_weight_config (
    id                  uuid primary key default extensions.uuid_generate_v4(),
    assessment_id       uuid not null unique references public.risk_assessments(id) on delete cascade,
    org_id              uuid not null references public.organizations(id) on delete cascade,
    weight_profile_id   uuid references public.weight_profiles(id),
    template_id         uuid references public.scoring_templates(id),
    weight_financial    smallint not null,
    weight_operational  smallint not null,
    weight_geopolitical smallint not null,
    weight_esg          smallint not null,
    indicator_weights   jsonb not null default '{}'::jsonb,
    indicator_active    jsonb not null default '{}'::jsonb,
    configured_by       uuid references auth.users(id),
    configuration_note  text,
    is_locked           boolean not null default false,
    created_at          timestamp with time zone not null default now(),
    updated_at          timestamp with time zone not null default now()
);


-- ================================================================
-- SECTION 3 — FONCTIONS HELPERS RLS
-- (doivent exister avant les policies qui les utilisent)
-- ================================================================

create or replace function public.is_org_member(
    p_org_id    uuid,
    p_min_role  text default 'viewer'
)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
    select exists (
        select 1 from public.org_members
        where org_id  = p_org_id
          and user_id = (select auth.uid())
          and status  = 'active'
          and case p_min_role
                when 'viewer'  then role in ('owner','admin','analyst','viewer','auditor')
                when 'auditor' then role in ('owner','admin','analyst','auditor')
                when 'analyst' then role in ('owner','admin','analyst')
                when 'admin'   then role in ('owner','admin')
                when 'owner'   then role = 'owner'
                else true
              end
    )
$$;

create or replace function public.my_org_ids()
returns setof uuid
language sql
security definer
stable
set search_path = ''
as $$
    select org_id
    from public.org_members
    where user_id = (select auth.uid())
      and status  = 'active'
$$;

grant execute on function public.is_org_member(uuid, text) to authenticated, service_role;
grant execute on function public.my_org_ids()               to authenticated, service_role;


-- ================================================================
-- SECTION 4 — ACTIVATION RLS + POLICIES
-- (toutes les tables existent désormais)
-- ================================================================

-- ── organizations ─────────────────────────────────────────────

alter table public.organizations enable row level security;

create policy org_select on public.organizations
    for select to authenticated
    using (
        id in (
            select org_id from public.org_members
            where user_id = (select auth.uid()) and status = 'active'
        )
    );

create policy org_update on public.organizations
    for update to authenticated
    using  (public.is_org_member(id, 'admin'))
    with check (public.is_org_member(id, 'admin'));

create policy org_insert on public.organizations
    for insert to authenticated
    with check (created_by = (select auth.uid()));

-- ── org_members ───────────────────────────────────────────────

alter table public.org_members enable row level security;

create policy org_members_select on public.org_members
    for select to authenticated
    using (org_id in (select public.my_org_ids()));

create policy org_members_insert on public.org_members
    for insert to authenticated
    with check (public.is_org_member(org_id, 'admin'));

create policy org_members_update on public.org_members
    for update to authenticated
    using (public.is_org_member(org_id, 'admin'));

create policy org_members_self_update on public.org_members
    for update to authenticated
    using (user_id = (select auth.uid()));

-- ── org_invitations ───────────────────────────────────────────

alter table public.org_invitations enable row level security;

create policy org_invitations_select on public.org_invitations
    for select to authenticated
    using (public.is_org_member(org_id, 'admin'));

create policy org_invitations_insert on public.org_invitations
    for insert to authenticated
    with check (public.is_org_member(org_id, 'admin'));

create policy org_invitations_update on public.org_invitations
    for update to authenticated
    using (public.is_org_member(org_id, 'admin'));

-- ── sso_configurations ────────────────────────────────────────

alter table public.sso_configurations enable row level security;

create policy sso_config_select on public.sso_configurations
    for select to authenticated
    using (public.is_org_member(org_id, 'admin'));

create policy sso_config_write on public.sso_configurations
    for all to authenticated
    using (public.is_org_member(org_id, 'admin'));

-- ── risk_indicator_catalog ────────────────────────────────────

alter table public.risk_indicator_catalog enable row level security;

create policy indicator_catalog_select on public.risk_indicator_catalog
    for select to authenticated using (true);

-- ── scoring_templates ─────────────────────────────────────────

alter table public.scoring_templates enable row level security;

create policy scoring_templates_select on public.scoring_templates
    for select to authenticated
    using (
        is_system = true
        or org_id is null
        or org_id in (select public.my_org_ids())
    );

create policy scoring_templates_write on public.scoring_templates
    for all to authenticated
    using (
        not is_system
        and public.is_org_member(org_id, 'analyst')
    );

-- ── template_indicators ───────────────────────────────────────

alter table public.template_indicators enable row level security;

create policy template_indicators_select on public.template_indicators
    for select to authenticated using (true);

create policy template_indicators_write on public.template_indicators
    for all to authenticated
    using (
        template_id in (
            select st.id from public.scoring_templates st
            where not st.is_system
              and public.is_org_member(st.org_id, 'analyst')
        )
    );

-- ── weight_profiles ───────────────────────────────────────────

alter table public.weight_profiles enable row level security;

create policy weight_profiles_select on public.weight_profiles
    for select to authenticated
    using (org_id in (select public.my_org_ids()));

create policy weight_profiles_write on public.weight_profiles
    for all to authenticated
    using (
        org_id in (
            select org_id from public.org_members
            where user_id              = (select auth.uid())
              and role                 in ('owner','admin','analyst')
              and can_configure_weights = true
              and status               = 'active'
        )
    );

-- ── assessment_weight_config ──────────────────────────────────

alter table public.assessment_weight_config enable row level security;

create policy assessment_weight_config_select on public.assessment_weight_config
    for select to authenticated
    using (org_id in (select public.my_org_ids()));

create policy assessment_weight_config_write on public.assessment_weight_config
    for all to authenticated
    using (org_id in (select public.my_org_ids()));


-- ================================================================
-- SECTION 5 — GRANTS
-- ================================================================

revoke all on public.organizations            from authenticated, service_role;
revoke all on public.org_members              from authenticated, service_role;
revoke all on public.org_invitations          from authenticated, service_role;
revoke all on public.sso_configurations       from authenticated, service_role;
revoke all on public.risk_indicator_catalog   from authenticated, service_role;
revoke all on public.scoring_templates        from authenticated, service_role;
revoke all on public.template_indicators      from authenticated, service_role;
revoke all on public.weight_profiles          from authenticated, service_role;
revoke all on public.assessment_weight_config from authenticated, service_role;

grant select, insert, update           on public.organizations            to authenticated, service_role;
grant select, insert, update           on public.org_members              to authenticated, service_role;
grant select, insert, update           on public.org_invitations          to authenticated, service_role;
grant select, insert, update, delete   on public.sso_configurations       to authenticated, service_role;
grant select                           on public.risk_indicator_catalog    to authenticated;
grant select, insert, update, delete   on public.risk_indicator_catalog    to service_role;
grant select, insert, update, delete   on public.scoring_templates         to authenticated, service_role;
grant select, insert, update, delete   on public.template_indicators       to authenticated, service_role;
grant select, insert, update, delete   on public.weight_profiles           to authenticated, service_role;
grant select, insert, update, delete   on public.assessment_weight_config  to authenticated, service_role;


-- ================================================================
-- SECTION 6 — AJOUT org_id SUR LES TABLES VENDORSHIELD
--             + MIGRATION DES POLICIES RLS
-- ================================================================

-- ── suppliers ──────────────────────────────────────────────────

alter table public.suppliers
    add column if not exists org_id uuid references public.organizations(id) on delete cascade;

create index if not exists idx_suppliers_org_id on public.suppliers(org_id);

drop policy if exists suppliers_select on public.suppliers;
drop policy if exists suppliers_insert on public.suppliers;
drop policy if exists suppliers_update on public.suppliers;
drop policy if exists suppliers_delete on public.suppliers;

create policy suppliers_select on public.suppliers for select to authenticated
    using (
        (org_id is not null and org_id in (select public.my_org_ids()))
        or (org_id is null and account_id = (select auth.uid()))
    );
create policy suppliers_insert on public.suppliers for insert to authenticated
    with check (
        (org_id is not null and public.is_org_member(org_id, 'analyst'))
        or (org_id is null and account_id = (select auth.uid()))
    );
create policy suppliers_update on public.suppliers for update to authenticated
    using (
        (org_id is not null and public.is_org_member(org_id, 'analyst'))
        or (org_id is null and account_id = (select auth.uid()))
    );
create policy suppliers_delete on public.suppliers for delete to authenticated
    using (
        (org_id is not null and public.is_org_member(org_id, 'admin'))
        or (org_id is null and account_id = (select auth.uid()))
    );

-- ── supplier_contacts ──────────────────────────────────────────

alter table public.supplier_contacts
    add column if not exists org_id uuid references public.organizations(id) on delete cascade;

drop policy if exists supplier_contacts_select on public.supplier_contacts;
drop policy if exists supplier_contacts_insert on public.supplier_contacts;
drop policy if exists supplier_contacts_update on public.supplier_contacts;
drop policy if exists supplier_contacts_delete on public.supplier_contacts;

create policy supplier_contacts_select on public.supplier_contacts for select to authenticated
    using ((org_id is not null and org_id in (select public.my_org_ids())) or (org_id is null and account_id = (select auth.uid())));
create policy supplier_contacts_insert on public.supplier_contacts for insert to authenticated
    with check ((org_id is not null and public.is_org_member(org_id,'analyst')) or (org_id is null and account_id = (select auth.uid())));
create policy supplier_contacts_update on public.supplier_contacts for update to authenticated
    using ((org_id is not null and public.is_org_member(org_id,'analyst')) or (org_id is null and account_id = (select auth.uid())));
create policy supplier_contacts_delete on public.supplier_contacts for delete to authenticated
    using ((org_id is not null and public.is_org_member(org_id,'admin')) or (org_id is null and account_id = (select auth.uid())));

-- ── risk_assessments ──────────────────────────────────────────

alter table public.risk_assessments
    add column if not exists org_id uuid references public.organizations(id) on delete cascade;

create index if not exists idx_risk_assessments_org on public.risk_assessments(org_id);

drop policy if exists risk_assessments_select on public.risk_assessments;
drop policy if exists risk_assessments_insert on public.risk_assessments;
drop policy if exists risk_assessments_update on public.risk_assessments;
drop policy if exists risk_assessments_delete on public.risk_assessments;

create policy risk_assessments_select on public.risk_assessments for select to authenticated
    using ((org_id is not null and org_id in (select public.my_org_ids())) or (org_id is null and account_id = (select auth.uid())));
create policy risk_assessments_insert on public.risk_assessments for insert to authenticated
    with check ((org_id is not null and public.is_org_member(org_id,'analyst')) or (org_id is null and account_id = (select auth.uid())));
create policy risk_assessments_update on public.risk_assessments for update to authenticated
    using ((org_id is not null and public.is_org_member(org_id,'analyst')) or (org_id is null and account_id = (select auth.uid())));
create policy risk_assessments_delete on public.risk_assessments for delete to authenticated
    using ((org_id is not null and public.is_org_member(org_id,'admin')) or (org_id is null and account_id = (select auth.uid())));

-- ── risk_factors ──────────────────────────────────────────────

alter table public.risk_factors
    add column if not exists org_id uuid references public.organizations(id) on delete cascade;

drop policy if exists risk_factors_select on public.risk_factors;
drop policy if exists risk_factors_insert on public.risk_factors;
drop policy if exists risk_factors_update on public.risk_factors;
drop policy if exists risk_factors_delete on public.risk_factors;

create policy risk_factors_select on public.risk_factors for select to authenticated
    using ((org_id is not null and org_id in (select public.my_org_ids())) or (org_id is null and account_id = (select auth.uid())));
create policy risk_factors_insert on public.risk_factors for insert to authenticated
    with check ((org_id is not null and public.is_org_member(org_id,'analyst')) or (org_id is null and account_id = (select auth.uid())));
create policy risk_factors_update on public.risk_factors for update to authenticated
    using ((org_id is not null and public.is_org_member(org_id,'analyst')) or (org_id is null and account_id = (select auth.uid())));
create policy risk_factors_delete on public.risk_factors for delete to authenticated
    using ((org_id is not null and public.is_org_member(org_id,'analyst')) or (org_id is null and account_id = (select auth.uid())));

-- ── alert_rules ───────────────────────────────────────────────

alter table public.alert_rules
    add column if not exists org_id uuid references public.organizations(id) on delete cascade;

drop policy if exists alert_rules_select on public.alert_rules;
drop policy if exists alert_rules_insert on public.alert_rules;
drop policy if exists alert_rules_update on public.alert_rules;
drop policy if exists alert_rules_delete on public.alert_rules;

create policy alert_rules_select on public.alert_rules for select to authenticated
    using ((org_id is not null and org_id in (select public.my_org_ids())) or (org_id is null and account_id = (select auth.uid())));
create policy alert_rules_insert on public.alert_rules for insert to authenticated
    with check ((org_id is not null and public.is_org_member(org_id,'analyst')) or (org_id is null and account_id = (select auth.uid())));
create policy alert_rules_update on public.alert_rules for update to authenticated
    using ((org_id is not null and public.is_org_member(org_id,'analyst')) or (org_id is null and account_id = (select auth.uid())));
create policy alert_rules_delete on public.alert_rules for delete to authenticated
    using ((org_id is not null and public.is_org_member(org_id,'admin')) or (org_id is null and account_id = (select auth.uid())));

-- ── alerts ────────────────────────────────────────────────────

alter table public.alerts
    add column if not exists org_id uuid references public.organizations(id) on delete cascade;

create index if not exists idx_alerts_org on public.alerts(org_id);

drop policy if exists alerts_select on public.alerts;
drop policy if exists alerts_insert on public.alerts;
drop policy if exists alerts_update on public.alerts;
drop policy if exists alerts_delete on public.alerts;

create policy alerts_select on public.alerts for select to authenticated
    using ((org_id is not null and org_id in (select public.my_org_ids())) or (org_id is null and account_id = (select auth.uid())));
create policy alerts_insert on public.alerts for insert to authenticated
    with check ((org_id is not null and org_id in (select public.my_org_ids())) or (org_id is null and account_id = (select auth.uid())));
create policy alerts_update on public.alerts for update to authenticated
    using ((org_id is not null and org_id in (select public.my_org_ids())) or (org_id is null and account_id = (select auth.uid())));
create policy alerts_delete on public.alerts for delete to authenticated
    using ((org_id is not null and public.is_org_member(org_id,'admin')) or (org_id is null and account_id = (select auth.uid())));

-- ── documents ─────────────────────────────────────────────────

alter table public.documents
    add column if not exists org_id uuid references public.organizations(id) on delete cascade;

drop policy if exists documents_select on public.documents;
drop policy if exists documents_insert on public.documents;
drop policy if exists documents_update on public.documents;
drop policy if exists documents_delete on public.documents;

create policy documents_select on public.documents for select to authenticated
    using ((org_id is not null and org_id in (select public.my_org_ids())) or (org_id is null and account_id = (select auth.uid())));
create policy documents_insert on public.documents for insert to authenticated
    with check ((org_id is not null and public.is_org_member(org_id,'analyst')) or (org_id is null and account_id = (select auth.uid())));
create policy documents_update on public.documents for update to authenticated
    using ((org_id is not null and public.is_org_member(org_id,'analyst')) or (org_id is null and account_id = (select auth.uid())));
create policy documents_delete on public.documents for delete to authenticated
    using ((org_id is not null and public.is_org_member(org_id,'analyst')) or (org_id is null and account_id = (select auth.uid())));

-- ── audit_log ─────────────────────────────────────────────────

alter table public.audit_log
    add column if not exists org_id uuid references public.organizations(id) on delete cascade;

create index if not exists idx_audit_log_org on public.audit_log(org_id);

drop policy if exists audit_log_select on public.audit_log;
drop policy if exists audit_log_insert on public.audit_log;

create policy audit_log_select on public.audit_log for select to authenticated
    using ((org_id is not null and org_id in (select public.my_org_ids())) or (org_id is null and account_id = (select auth.uid())));
create policy audit_log_insert on public.audit_log for insert to authenticated
    with check ((org_id is not null and org_id in (select public.my_org_ids())) or (org_id is null and account_id = (select auth.uid())));


-- ================================================================
-- SECTION 7 — CATALOGUE DES INDICATEURS (24 indicateurs)
-- ================================================================

insert into public.risk_indicator_catalog
    (dimension, key, label_fr, label_en, default_weight, is_required,
     scoring_guide, data_source_type, sort_order)
values
-- FINANCIER
('financial','credit_rating','Notation de crédit & solvabilité','Credit Rating & Solvency',
 8, true,
 '{"0":"Défaut / liquidation","20":"Caa-C (risque très élevé)","40":"B (risque élevé)","60":"BB (risque modéré)","80":"BBB-A (risque faible)","100":"AA-AAA (risque minimal)"}'::jsonb,
 'dun_bradstreet', 1),
('financial','payment_delays','Historique des retards de paiement','Payment Delay History',
 6, false,
 '{"0":"Retards systématiques >90j","25":"Retards fréquents 30-90j","50":"Retards occasionnels <30j","75":"Retards très rares","100":"Jamais de retard"}'::jsonb,
 'manual', 2),
('financial','revenue_stability','Stabilité du chiffre d''affaires','Revenue Stability',
 5, false,
 '{"0":"Baisse >30% sur 2 ans","25":"Baisse 15-30%","50":"CA stable ±5%","75":"Croissance 5-15%","100":"Croissance >15%"}'::jsonb,
 'dun_bradstreet', 3),
('financial','debt_ratio','Niveau d''endettement (Dette/EBITDA)','Debt-to-EBITDA Ratio',
 7, false,
 '{"0":"Ratio >7x","25":"Ratio 5-7x","50":"Ratio 3-5x","75":"Ratio 1-3x","100":"Ratio <1x"}'::jsonb,
 'dun_bradstreet', 4),
('financial','customer_concentration','Concentration client','Customer Concentration',
 4, false,
 '{"0":"1 client >80% CA","25":"Top 3 >70%","50":"Top 3 40-70%","75":"Top 3 20-40%","100":"Portefeuille très diversifié"}'::jsonb,
 'manual', 5),
('financial','profitability','Rentabilité & marges','Profitability & Margins',
 5, false,
 '{"0":"Pertes significatives","25":"Marges <2%","50":"Marges 2-8%","75":"Marges 8-15%","100":"Marges >15%"}'::jsonb,
 'dun_bradstreet', 6),
-- OPÉRATIONNEL
('operational','delivery_reliability','Fiabilité des livraisons (OTD)','On-Time Delivery Rate',
 8, true,
 '{"0":"OTD <60%","25":"OTD 60-75%","50":"OTD 75-85%","75":"OTD 85-95%","100":"OTD >95%"}'::jsonb,
 'manual', 10),
('operational','quality_certifications','Certifications qualité','Quality Certifications',
 7, false,
 '{"0":"Aucune certification","25":"Certification expirée","50":"ISO 9001 basique","75":"Multi-certifié","100":"Certifié + audité annuellement"}'::jsonb,
 'manual', 11),
('operational','capacity_flexibility','Flexibilité de production','Production Flexibility',
 5, false,
 '{"0":"Capacité saturée","25":"Marge <10%","50":"Marge 10-20%","75":"Marge 20-40%","100":"Grande flexibilité >40%"}'::jsonb,
 'manual', 12),
('operational','substitutability','Facilité de substitution','Supplier Substitutability',
 9, true,
 '{"0":"Fournisseur unique impossible à remplacer","25":"1 alternative difficile","50":"2-3 alternatives avec délai","75":"Plusieurs alternatives disponibles","100":"Substitution immédiate possible"}'::jsonb,
 'manual', 13),
('operational','it_security','Cyber-sécurité & résilience IT','IT Security',
 6, false,
 '{"0":"Aucune politique de sécurité","25":"Sécurité basique","50":"Politique formalisée","75":"Certifié ISO 27001","100":"SOC2 + ISO 27001 + tests réguliers"}'::jsonb,
 'manual', 14),
('operational','bcp_existence','Plan de continuité (BCP/PCA)','Business Continuity Plan',
 6, false,
 '{"0":"Aucun BCP","25":"BCP informel non testé","50":"BCP documenté peu testé","75":"BCP testé annuellement","100":"BCP robuste certifié"}'::jsonb,
 'manual', 15),
('operational','subcontractor_risk','Risque de sous-traitance','Subcontracting Risk',
 4, false,
 '{"0":"Sous-traitance >80% sans contrôle","25":"Sous-traitance élevée","50":"Sous-traitance partielle maîtrisée","75":"Faible sous-traitance","100":"Production 100% en propre"}'::jsonb,
 'manual', 16),
-- GÉOPOLITIQUE
('geopolitical','country_risk','Indice de risque pays','Country Risk Index',
 9, true,
 '{"0":"Zone de conflit","20":"Risque très élevé","40":"Risque élevé","60":"Risque modéré","80":"Risque faible","100":"Pays OCDE stable"}'::jsonb,
 'oecd', 20),
('geopolitical','sanctions_exposure','Exposition aux sanctions & embargos','Sanctions Exposure',
 10, true,
 '{"0":"Entité sanctionnée","20":"Surveillance active","50":"Exposition indirecte","75":"Zone grise","100":"Aucune exposition"}'::jsonb,
 'oecd', 21),
('geopolitical','trade_restrictions','Restrictions commerciales & douanières','Trade Restrictions',
 6, false,
 '{"0":"Embargo total","25":"Restrictions sévères","50":"Restrictions modérées","75":"Quelques barrières","100":"Libre-échange total"}'::jsonb,
 'oecd', 22),
('geopolitical','currency_risk','Risque de change','Currency Risk',
 4, false,
 '{"0":"Hyperinflation / inconvertible","25":"Forte volatilité","50":"Volatilité modérée","75":"Monnaie stable","100":"Zone euro ou devise très stable"}'::jsonb,
 'manual', 23),
('geopolitical','infrastructure','Qualité des infrastructures logistiques','Logistics Infrastructure',
 4, false,
 '{"0":"Infrastructures très déficientes","25":"Infrastructures limitées","50":"Infrastructures correctes","75":"Bonnes infrastructures","100":"Infrastructures excellentes"}'::jsonb,
 'oecd', 24),
-- ESG
('esg','carbon_footprint','Empreinte carbone & politique climat','Carbon Footprint',
 7, false,
 '{"0":"Aucune mesure","25":"Mesures initiales sans objectifs","50":"Bilan carbone + objectifs définis","75":"Réduction en cours (SBTi)","100":"Neutre en carbone certifié"}'::jsonb,
 'ecovadis', 30),
('esg','labor_practices','Conditions & pratiques de travail','Labor Practices',
 8, true,
 '{"0":"Violations graves","25":"Non-conformités significatives","50":"Conformité basique","75":"Bonnes pratiques","100":"Certifié SA8000"}'::jsonb,
 'ecovadis', 31),
('esg','human_rights','Droits humains (devoir de vigilance)','Human Rights',
 8, true,
 '{"0":"Violations documentées","25":"Risques sans plan d''action","50":"Politique formalisée partielle","75":"Dispositif solide + audits","100":"Référence sectorielle"}'::jsonb,
 'ecovadis', 32),
('esg','corruption_bribery','Anti-corruption & éthique des affaires','Anti-Corruption',
 7, false,
 '{"0":"Condamnations en cours","25":"Risque élevé sans programme","50":"Politique basique","75":"Programme solide + formation","100":"Certifié ISO 37001"}'::jsonb,
 'ecovadis', 33),
('esg','environmental_compliance','Conformité environnementale réglementaire','Environmental Compliance',
 5, false,
 '{"0":"Violations graves","25":"Non-conformités multiples","50":"Conformité basique","75":"Au-delà de la conformité","100":"ISO 14001 exemplaire"}'::jsonb,
 'ecovadis', 34),
('esg','data_privacy','Protection des données (RGPD)','Data Privacy',
 4, false,
 '{"0":"Violations graves","25":"Non-conformité RGPD","50":"Conformité partielle","75":"Conformité établie + DPO","100":"Certifié ISO 27701"}'::jsonb,
 'manual', 35);


-- ================================================================
-- SECTION 8 — TEMPLATES DE SCORING SYSTÈME
-- ================================================================

insert into public.scoring_templates
    (name, description, industry, is_system,
     weight_financial, weight_operational, weight_geopolitical, weight_esg)
values
('Générique Équilibré',
 'Template par défaut pour tous secteurs.',
 null, true, 30, 30, 20, 20),
('Industrie Manufacturière',
 'Priorité opérationnelle et financière.',
 'manufacturing', true, 35, 35, 15, 15),
('Secteur Chimique & Matériaux',
 'ESG et conformité renforcés (REACH, CLP).',
 'chemicals', true, 25, 30, 15, 30),
('Logistique & Transport',
 'Focus géopolitique et opérationnel.',
 'logistics', true, 25, 35, 30, 10),
('Services Technologiques & IT',
 'Priorité cyber-sécurité et continuité.',
 'technology', true, 30, 35, 20, 15),
('Énergie & Utilities',
 'Équilibre géopolitique et ESG.',
 'energy', true, 25, 25, 25, 25),
('Fournisseurs Critiques Sole-Source',
 'Approche maximalement prudente pour fournisseurs uniques.',
 null, true, 30, 30, 20, 20);


-- ================================================================
-- SECTION 9 — FONCTION ONBOARDING
-- ================================================================

create or replace function public.create_organization(
    p_name     text,
    p_slug     text,
    p_industry text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_org_id  uuid;
    v_user_id uuid := (select auth.uid());
begin
    insert into public.organizations (name, slug, industry, created_by)
    values (
        p_name,
        lower(regexp_replace(p_slug, '[^a-z0-9-]', '-', 'g')),
        p_industry,
        v_user_id
    )
    returning id into v_org_id;

    insert into public.org_members
        (org_id, user_id, role, can_configure_weights, can_approve_assessments, can_manage_alert_rules)
    values
        (v_org_id, v_user_id, 'owner', true, true, true);

    insert into public.weight_profiles
        (org_id, name, description, is_default,
         weight_financial, weight_operational, weight_geopolitical, weight_esg, created_by)
    values
        (v_org_id, 'Profil par défaut', 'Profil équilibré générique',
         true, 30, 30, 20, 20, v_user_id);

    return v_org_id;
end;
$$;

grant execute on function public.create_organization(text, text, text) to authenticated, service_role;


-- ================================================================
-- SECTION 10 — TRIGGERS updated_at
-- ================================================================

create trigger set_updated_at before update on public.organizations
    for each row execute function kit.update_updated_at();
create trigger set_updated_at before update on public.org_members
    for each row execute function kit.update_updated_at();
create trigger set_updated_at before update on public.sso_configurations
    for each row execute function kit.update_updated_at();
create trigger set_updated_at before update on public.scoring_templates
    for each row execute function kit.update_updated_at();
create trigger set_updated_at before update on public.weight_profiles
    for each row execute function kit.update_updated_at();
create trigger set_updated_at before update on public.assessment_weight_config
    for each row execute function kit.update_updated_at();


-- ================================================================
-- FIN DE LA MIGRATION
-- ================================================================