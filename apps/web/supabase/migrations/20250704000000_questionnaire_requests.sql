-- Portail fournisseur — envois de questionnaires d'auto-évaluation.
-- Une ligne par envoi à un fournisseur ; les questions sont snapshotées (jsonb)
-- pour rester stables même si le template évolue. Accès externe par token.

CREATE TABLE IF NOT EXISTS public.questionnaire_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  supplier_id   uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  token         text NOT NULL UNIQUE,
  title         text NOT NULL,
  version       text NOT NULL,
  questions     jsonb NOT NULL,          -- snapshot du template
  responses     jsonb,                   -- réponses du fournisseur
  score         numeric,                 -- 0-100 calculé à la soumission
  status        text NOT NULL DEFAULT 'pending', -- pending | submitted | expired
  expires_at    timestamptz,
  sent_at       timestamptz NOT NULL DEFAULT now(),
  submitted_at  timestamptz,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questionnaire_requests_supplier
  ON public.questionnaire_requests(supplier_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_questionnaire_requests_token
  ON public.questionnaire_requests(token);

-- RLS : seuls les membres du compte voient/gèrent leurs envois.
-- Le portail public (fournisseur) passe par le service role côté serveur,
-- autorisé par la possession du token — donc PAS de policy anonyme ici.
ALTER TABLE public.questionnaire_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "questionnaire_requests_select" ON public.questionnaire_requests
  FOR SELECT TO authenticated
  USING (account_id = (select auth.uid()));

CREATE POLICY "questionnaire_requests_insert" ON public.questionnaire_requests
  FOR INSERT TO authenticated
  WITH CHECK (account_id = (select auth.uid()));

CREATE POLICY "questionnaire_requests_delete" ON public.questionnaire_requests
  FOR DELETE TO authenticated
  USING (account_id = (select auth.uid()));
