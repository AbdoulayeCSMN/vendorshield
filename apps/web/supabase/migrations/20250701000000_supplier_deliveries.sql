-- Couche d'anticipation — Fondation : historique de performance fournisseur.
--
-- Alimentée par le module Import. Sert de jeu de données d'entraînement aux
-- modèles de prédiction (retards de livraison, défauts/PPM) et de base aux
-- indicateurs opérationnels (OTD, PPM moyen, tendance).

CREATE TABLE IF NOT EXISTS public.supplier_deliveries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  supplier_id   uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_ref  text,           -- identifiant fournisseur brut du fichier (pour rapprochement)
  planned_date  date,
  actual_date   date,
  -- Retard en jours (réel - prévu) ; négatif = en avance. Colonnes générées.
  delay_days    integer GENERATED ALWAYS AS (
                  CASE WHEN planned_date IS NOT NULL AND actual_date IS NOT NULL
                       THEN (actual_date - planned_date) END
                ) STORED,
  on_time       boolean GENERATED ALWAYS AS (
                  CASE WHEN planned_date IS NOT NULL AND actual_date IS NOT NULL
                       THEN (actual_date - planned_date) <= 0 END
                ) STORED,
  ppm           numeric,        -- défauts en parties par million
  quantity      numeric,
  status        text,
  import_id     uuid REFERENCES public.data_imports(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_deliveries_account ON public.supplier_deliveries(account_id);
CREATE INDEX IF NOT EXISTS idx_supplier_deliveries_supplier ON public.supplier_deliveries(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_deliveries_planned ON public.supplier_deliveries(account_id, planned_date);
CREATE INDEX IF NOT EXISTS idx_supplier_deliveries_ref ON public.supplier_deliveries(account_id, supplier_ref);

ALTER TABLE public.supplier_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supplier_deliveries_select" ON public.supplier_deliveries
  FOR SELECT TO authenticated
  USING (account_id = (select auth.uid()));

CREATE POLICY "supplier_deliveries_insert" ON public.supplier_deliveries
  FOR INSERT TO authenticated
  WITH CHECK (account_id = (select auth.uid()));

CREATE POLICY "supplier_deliveries_delete" ON public.supplier_deliveries
  FOR DELETE TO authenticated
  USING (account_id = (select auth.uid()));

-- Vue d'agrégats par fournisseur (indicateurs opérationnels + features modèle).
CREATE OR REPLACE VIEW public.supplier_delivery_stats
WITH (security_invoker = true) AS
SELECT
  account_id,
  supplier_id,
  count(*)                                              AS deliveries_count,
  count(*) FILTER (WHERE on_time IS TRUE)               AS on_time_count,
  count(*) FILTER (WHERE on_time IS FALSE)              AS late_count,
  round(
    100.0 * count(*) FILTER (WHERE on_time IS TRUE)
    / NULLIF(count(*) FILTER (WHERE on_time IS NOT NULL), 0)
  , 1)                                                  AS otd_rate,         -- % On-Time Delivery
  round(avg(delay_days) FILTER (WHERE delay_days IS NOT NULL), 1) AS avg_delay_days,
  max(delay_days)                                       AS max_delay_days,
  round(avg(ppm) FILTER (WHERE ppm IS NOT NULL), 0)     AS avg_ppm,
  count(*) FILTER (WHERE planned_date >= (current_date - interval '90 days')) AS deliveries_last_90d,
  count(*) FILTER (WHERE on_time IS FALSE
                    AND planned_date >= (current_date - interval '90 days'))  AS late_last_90d,
  min(planned_date)                                     AS first_delivery,
  max(planned_date)                                     AS last_delivery
FROM public.supplier_deliveries
WHERE supplier_id IS NOT NULL
GROUP BY account_id, supplier_id;
