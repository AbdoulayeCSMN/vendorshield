import 'server-only';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

/**
 * Scorecard de performance fournisseur — les 5 KPIs standard du métier :
 * ponctualité (OTD), conformité qualité, incidents, score financier et
 * dépendance (part de la dépense). Calculés depuis l'historique de livraisons,
 * les alertes et le score financier.
 */

const PPM_THRESHOLD = 5000;

export interface SupplierKpis {
  otd_rate: number | null; // % livraisons à l'heure
  conformity_rate: number | null; // % livraisons sous le seuil PPM
  incident_count: number; // alertes ouvertes
  financial_score: number | null;
  spend_share: number | null; // % de la dépense totale du compte (dépendance)
  deliveries_count: number;
}

export async function getSupplierKpis(supplierId: string): Promise<SupplierKpis> {
  const client = getSupabaseServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = client as any;

  const [deliveriesRes, incidentsRes, supplierRes, allSpendRes] = await Promise.all([
    c
      .from('supplier_deliveries')
      .select('on_time, ppm')
      .eq('supplier_id', supplierId),
    c
      .from('alerts')
      .select('id', { count: 'exact', head: true })
      .eq('supplier_id', supplierId)
      .eq('status', 'open'),
    c
      .from('supplier_risk_summary')
      .select('financial_score, annual_spend_eur')
      .eq('id', supplierId)
      .maybeSingle(),
    c
      .from('supplier_risk_summary')
      .select('annual_spend_eur')
      .eq('status', 'active'),
  ]);

  const deliveries = (deliveriesRes.data ?? []) as { on_time: boolean | null; ppm: number | null }[];
  const labelled = deliveries.filter((d) => d.on_time !== null);
  const otd =
    labelled.length > 0
      ? Math.round((labelled.filter((d) => d.on_time).length / labelled.length) * 100)
      : null;

  const withPpm = deliveries.filter((d) => d.ppm !== null);
  const conformity =
    withPpm.length > 0
      ? Math.round(
          (withPpm.filter((d) => (d.ppm as number) <= PPM_THRESHOLD).length / withPpm.length) * 100,
        )
      : null;

  const totalSpend = ((allSpendRes.data ?? []) as { annual_spend_eur: number | null }[]).reduce(
    (sum, s) => sum + (s.annual_spend_eur ?? 0),
    0,
  );
  const supplierSpend = (supplierRes.data?.annual_spend_eur as number | null) ?? null;
  const spendShare =
    supplierSpend !== null && totalSpend > 0
      ? Math.round((supplierSpend / totalSpend) * 1000) / 10
      : null;

  return {
    otd_rate: otd,
    conformity_rate: conformity,
    incident_count: incidentsRes.count ?? 0,
    financial_score: (supplierRes.data?.financial_score as number | null) ?? null,
    spend_share: spendShare,
    deliveries_count: deliveries.length,
  };
}
