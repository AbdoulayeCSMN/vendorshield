/**
 * PATCH — app/home/suppliers/[id]/page.tsx
 *
 * Ajouter ces imports après les imports existants :
 *
 *   import { getSupplyChainGraph } from '~/lib/vendorshield/actions/tier.actions';
 *   import { TierNetworkGraph } from './_components/tier-network-graph';
 *
 * Ajouter getSupplyChainGraph dans Promise.all :
 *
 *   const [supplier, analyses, configStatus, predictions, scGraph] = await Promise.all([
 *     getSupplierById(id),
 *     getSupplierAnalyses(id, 5),
 *     getAiConfigStatus(),
 *     getSupplierPredictions(id, 4),
 *     getSupplyChainGraph(id),            ← AJOUTER
 *   ]);
 *
 * Ajouter une section dédiée APRÈS la grille existante (avant la fermeture de PageBody) :
 *
 *   <section id="supply-chain" className="mt-6 scroll-mt-16">
 *     <TierNetworkGraph
 *       supplierId={id}
 *       supplierName={supplier.name}
 *       initialGraph={scGraph}
 *     />
 *   </section>
 *
 * VERSION COMPLÈTE du fichier après patch :
 */

// ── Fichier complet ────────────────────────────────────────────────────────────

import { notFound } from 'next/navigation';

import { PageBody, PageHeader } from '@kit/ui/page';
import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';

import { withI18n } from '~/lib/i18n/with-i18n';
import {
  getAiConfigStatus,
  getSupplierAnalyses,
} from '~/lib/vendorshield/actions/ai.actions';
import { getSupplierPredictions } from '~/lib/vendorshield/actions/prediction.actions';
import { getDeliveryPrediction } from '~/lib/vendorshield/actions/operational-prediction.actions';
import { getSupplyChainGraph } from '~/lib/vendorshield/actions/tier.actions';
import { getSupplierById } from '~/lib/vendorshield/suppliers.server';
import { getSupplierKpis } from '~/lib/vendorshield/kpis.server';

import { BankruptcyPanel } from './_components/bankruptcy-panel';
import { ClimateRiskPanel } from './_components/climate-risk-panel';
import { OperationalPredictionPanel } from './_components/operational-prediction-panel';
import { SupplierKpiScorecard } from './_components/supplier-kpi-scorecard';
import { SupplierAiPanel } from './_components/supplier-ai-panel';
import { SupplierDetail } from './_components/supplier-detail';
import { TierNetworkGraph } from './_components/tier-network-graph';

interface Props {
  params: Promise<{ id: string }>;
}

async function SupplierDetailPage({ params }: Props) {
  const { id } = await params;

  const [supplier, analyses, configStatus, predictions, scGraph, deliveryPrediction, kpis] =
    await Promise.all([
      getSupplierById(id),
      getSupplierAnalyses(id, 5),
      getAiConfigStatus(),
      getSupplierPredictions(id, 4),
      getSupplyChainGraph(id),
      getDeliveryPrediction(id),
      getSupplierKpis(id),
    ]);

  if (!supplier) notFound();

  return (
    <>
      <PageHeader title={supplier.name} description={<AppBreadcrumbs />} />
      <PageBody>
        {/* Grille principale */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 space-y-6">
            <SupplierDetail supplier={supplier} />
            <SupplierKpiScorecard kpis={kpis} />
          </div>
          <div className="space-y-4">
            <OperationalPredictionPanel supplierId={id} initial={deliveryPrediction} />
            <ClimateRiskPanel supplierId={id} />
            <BankruptcyPanel supplierId={id} predictions={predictions} />
            <SupplierAiPanel supplierId={id} pastAnalyses={analyses} configStatus={configStatus} />
          </div>
        </div>

        {/* Section Supply Chain Graph */}
        <section id="supply-chain" className="mt-6 scroll-mt-16">
          <TierNetworkGraph
            supplierId={id}
            supplierName={supplier.name}
            initialGraph={scGraph}
          />
        </section>
      </PageBody>
    </>
  );
}

export default withI18n(SupplierDetailPage);

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const supplier = await getSupplierById(id);
  return { title: supplier ? `${supplier.name} — VendorShield` : 'Fournisseur' };
}
