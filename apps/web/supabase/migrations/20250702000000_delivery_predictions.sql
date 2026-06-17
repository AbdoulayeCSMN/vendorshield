-- Couche d'anticipation — Prédictions opérationnelles par fournisseur.
-- Alimentée par le moteur ML (régression logistique retards + tendance PPM),
-- une ligne par fournisseur, recalculée à la demande / par cron.

CREATE TABLE IF NOT EXISTS public.delivery_predictions (
  account_id             uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  supplier_id            uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  delay_probability      numeric,            -- 0-100, P(prochaine livraison en retard)
  expected_delay_days    numeric,
  predicted_ppm          numeric,
  ppm_breach_probability numeric,            -- 0-100
  risk_level             text,               -- low | medium | high | critical
  confidence             numeric,            -- 0-100 (volume de données)
  data_points            integer NOT NULL DEFAULT 0,
  features               jsonb,              -- audit : features + poids + drivers
  explanation            text,               -- synthèse LLM (optionnelle)
  model_version          text,
  generated_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, supplier_id)
);

CREATE INDEX IF NOT EXISTS idx_delivery_predictions_supplier
  ON public.delivery_predictions(supplier_id);
CREATE INDEX IF NOT EXISTS idx_delivery_predictions_risk
  ON public.delivery_predictions(account_id, risk_level);

ALTER TABLE public.delivery_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delivery_predictions_select" ON public.delivery_predictions
  FOR SELECT TO authenticated
  USING (account_id = (select auth.uid()));

CREATE POLICY "delivery_predictions_insert" ON public.delivery_predictions
  FOR INSERT TO authenticated
  WITH CHECK (account_id = (select auth.uid()));

CREATE POLICY "delivery_predictions_update" ON public.delivery_predictions
  FOR UPDATE TO authenticated
  USING (account_id = (select auth.uid()))
  WITH CHECK (account_id = (select auth.uid()));
