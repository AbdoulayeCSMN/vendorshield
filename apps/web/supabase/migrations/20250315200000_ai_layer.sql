/*
 * ================================================================
 * VendorShield — Couche IA : stockage des analyses OSINT
 * ================================================================
 */

-- Type de source d'analyse
create type public.ai_analysis_source as enum (
    'osint_news',
    'financial_signals',
    'document_analysis',
    'manual_trigger'
);

-- Type de statut d'une analyse
create type public.ai_analysis_status as enum (
    'pending',
    'running',
    'completed',
    'failed'
);

-- ── Table ai_analyses ──────────────────────────────────────────────────────────
-- Stocke chaque analyse IA réalisée sur un fournisseur.
-- Un enregistrement = une passe d'analyse sur un fournisseur donné.

create table if not exists public.ai_analyses (
    id                  uuid primary key default extensions.uuid_generate_v4(),
    account_id          uuid not null references public.accounts(id) on delete cascade,
    supplier_id         uuid not null references public.suppliers(id) on delete cascade,

    -- Paramètres de l'analyse
    source              public.ai_analysis_source not null default 'manual_trigger',
    model_used          varchar(100) not null default 'claude-sonnet-4-20250514',
    prompt_tokens       integer,
    completion_tokens   integer,

    -- Résultat
    status              public.ai_analysis_status not null default 'pending',
    risk_signals        jsonb not null default '[]'::jsonb, -- [{type, severity, title, description, source_url}]
    recommendations     jsonb not null default '[]'::jsonb, -- [{priority, action, rationale}]
    overall_assessment  text,                               -- synthèse narrative
    confidence_score    smallint check (confidence_score between 0 and 100),

    -- Alertes créées par cette analyse
    alerts_created      integer not null default 0,

    -- Erreur éventuelle
    error_message       text,

    -- Meta
    triggered_by        uuid references auth.users(id),     -- null = cron job
    started_at          timestamp with time zone,
    completed_at        timestamp with time zone,
    created_at          timestamp with time zone not null default now()
);

comment on table public.ai_analyses is 'Analyses IA OSINT réalisées sur les fournisseurs';
comment on column public.ai_analyses.risk_signals is 'Signaux de risque détectés, format JSON structuré';
comment on column public.ai_analyses.recommendations is 'Recommandations priorisées générées par le modèle';

create index idx_ai_analyses_account    on public.ai_analyses(account_id);
create index idx_ai_analyses_supplier   on public.ai_analyses(supplier_id);
create index idx_ai_analyses_status     on public.ai_analyses(status);
create index idx_ai_analyses_created    on public.ai_analyses(account_id, created_at desc);

alter table public.ai_analyses enable row level security;

create policy ai_analyses_select on public.ai_analyses
    for select to authenticated
    using (account_id = (select auth.uid()));

create policy ai_analyses_insert on public.ai_analyses
    for insert to authenticated
    with check (account_id = (select auth.uid()));

revoke all on public.ai_analyses from authenticated, service_role;
grant select, insert on public.ai_analyses to authenticated, service_role;

-- Trigger updated_at n'est pas nécessaire ici (pas d'UPDATE)

-- ── Index full-text sur l'overall_assessment pour recherche future ────────────
create index idx_ai_analyses_assessment_fts on public.ai_analyses
    using gin(to_tsvector('french', coalesce(overall_assessment, '')));
