-- ════════════════════════════════════════════════════════════════════════════
-- TEST — Génère un historique de livraisons réaliste pour CHAQUE fournisseur
-- existant, afin d'entraîner et tester les modèles de prédiction opérationnelle.
--
-- À exécuter dans Supabase → SQL Editor APRÈS avoir appliqué les migrations
-- 20250701000000_supplier_deliveries.sql et 20250702000000_delivery_predictions.sql
--
-- Le signal est corrélé au global_score du fournisseur :
--   score bas  → plus de retards + PPM plus élevé   (le modèle l'apprendra)
--   score haut → livraisons ponctuelles, peu de défauts
--
-- Ré-exécutable : décommente le TRUNCATE pour repartir de zéro.
-- ════════════════════════════════════════════════════════════════════════════

-- TRUNCATE TABLE public.supplier_deliveries;

INSERT INTO public.supplier_deliveries
  (account_id, supplier_id, supplier_ref, planned_date, actual_date, ppm, quantity, status)
SELECT
  s.account_id,
  s.id,
  s.name,
  d.planned,
  -- Retard : probabilité et amplitude inversement liées au score.
  (d.planned + (
    CASE
      WHEN random() < (1 - COALESCE(s.global_score, 60) / 120.0)
        THEN floor(random() * 18 + 1)::int      -- en retard : 1 à 18 jours
      ELSE floor(random() * 3 - 1)::int          -- à l'heure / en avance : -1 à +1
    END
  ) * INTERVAL '1 day')::date                    AS actual_date,
  -- PPM : croît quand le score baisse, + bruit, jamais négatif.
  GREATEST(0, round(
    3000 + (60 - COALESCE(s.global_score, 60)) * 120 + (random() * 1600 - 800)
  ))::numeric                                     AS ppm,
  round(100 + random() * 900)::numeric           AS quantity,
  'delivered'                                     AS status
FROM public.suppliers s
CROSS JOIN LATERAL (
  -- 24 livraisons mensuelles sur les 2 dernières années.
  SELECT (current_date - (g || ' months')::interval)::date AS planned
  FROM generate_series(1, 24) AS g
) d;

-- Vérification rapide :
--   SELECT supplier_id, count(*), round(avg(delay_days),1) avg_delay, round(avg(ppm)) avg_ppm
--   FROM public.supplier_deliveries GROUP BY supplier_id;
