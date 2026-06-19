-- Audits fournisseurs + Plans d'action correctifs (CAPA).

CREATE TABLE IF NOT EXISTS public.supplier_audits (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id     uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  supplier_id    uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  audit_type     text NOT NULL,           -- quality | social | security | financial | onsite
  title          text NOT NULL,
  auditor        text,
  scheduled_date date,
  completed_date date,
  status         text NOT NULL DEFAULT 'planned', -- planned | in_progress | completed | cancelled
  result         text,                    -- pass | conditional | fail
  score          numeric,
  findings       text,
  created_by     uuid REFERENCES auth.users(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.corrective_actions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id     uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  supplier_id    uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  title          text NOT NULL,
  description    text,
  source         text,                    -- alert | audit | assessment | manual
  priority       text NOT NULL DEFAULT 'medium', -- low | medium | high
  status         text NOT NULL DEFAULT 'open',   -- open | in_progress | done | cancelled
  owner          text,
  due_date       date,
  completed_date date,
  created_by     uuid REFERENCES auth.users(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_audits_supplier ON public.supplier_audits(supplier_id);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_supplier ON public.corrective_actions(supplier_id);

ALTER TABLE public.supplier_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corrective_actions ENABLE ROW LEVEL SECURITY;

-- Policies : accès limité au compte (account_id = utilisateur courant).
CREATE POLICY "supplier_audits_all" ON public.supplier_audits
  FOR ALL TO authenticated
  USING (account_id = (select auth.uid()))
  WITH CHECK (account_id = (select auth.uid()));

CREATE POLICY "corrective_actions_all" ON public.corrective_actions
  FOR ALL TO authenticated
  USING (account_id = (select auth.uid()))
  WITH CHECK (account_id = (select auth.uid()));
