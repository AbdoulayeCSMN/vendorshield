-- Module Conformité & Documents — certifications, contrats, audits, plans de
-- vigilance par fournisseur, avec suivi d'expiration (CSRD / devoir de vigilance).

CREATE TABLE IF NOT EXISTS public.supplier_documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  supplier_id  uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  doc_type     text NOT NULL,            -- iso_9001 | iso_14001 | code_conduct | vigilance_plan | insurance | contract | audit_report | rgpd_dpa | other
  name         text NOT NULL,
  issuer       text,                     -- organisme émetteur / certificateur
  reference    text,                     -- numéro de certificat / contrat
  issued_date  date,
  expiry_date  date,                     -- NULL = sans expiration
  file_url     text,
  notes        text,
  created_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_documents_supplier
  ON public.supplier_documents(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_documents_expiry
  ON public.supplier_documents(account_id, expiry_date);

ALTER TABLE public.supplier_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supplier_documents_select" ON public.supplier_documents
  FOR SELECT TO authenticated
  USING (account_id = (select auth.uid()));

CREATE POLICY "supplier_documents_insert" ON public.supplier_documents
  FOR INSERT TO authenticated
  WITH CHECK (account_id = (select auth.uid()));

CREATE POLICY "supplier_documents_update" ON public.supplier_documents
  FOR UPDATE TO authenticated
  USING (account_id = (select auth.uid()))
  WITH CHECK (account_id = (select auth.uid()));

CREATE POLICY "supplier_documents_delete" ON public.supplier_documents
  FOR DELETE TO authenticated
  USING (account_id = (select auth.uid()));
