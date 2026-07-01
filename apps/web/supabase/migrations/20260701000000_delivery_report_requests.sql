-- Portail fournisseur — Saisie de commandes / livraisons
-- Permet d'envoyer un lien sécurisé (sans compte) à un fournisseur pour qu'il
-- renseigne lui-même ses données de livraison (délai, retard, défauts, quantité).
-- Les données soumises alimentent directement la table supplier_deliveries.

CREATE TABLE IF NOT EXISTS public.delivery_report_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  supplier_id   uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  supplier_name text NOT NULL,
  token         text NOT NULL UNIQUE,
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'submitted', 'expired')),
  period_label  text,           -- libellé de la période : "Juillet 2026", "Semaine 28"…
  order_ref     text,           -- référence de commande pré-remplie (optionnel)
  expires_at    timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  submitted_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drr_account   ON public.delivery_report_requests(account_id);
CREATE INDEX IF NOT EXISTS idx_drr_supplier  ON public.delivery_report_requests(supplier_id);
CREATE INDEX IF NOT EXISTS idx_drr_token     ON public.delivery_report_requests(token);

ALTER TABLE public.delivery_report_requests ENABLE ROW LEVEL SECURITY;

-- Le propriétaire (acheteur) peut tout faire sur ses propres demandes.
CREATE POLICY "delivery_report_requests_owner" ON public.delivery_report_requests
  FOR ALL TO authenticated
  USING  (account_id = (select auth.uid()))
  WITH CHECK (account_id = (select auth.uid()));
