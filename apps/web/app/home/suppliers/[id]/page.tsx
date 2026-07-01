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
import { getSupplierCompliance } from '~/lib/vendorshield/actions/document.actions';
import { getSupplierQuestionnaires } from '~/lib/vendorshield/actions/questionnaire.actions';
import { getSupplierDeliveryReports } from '~/lib/vendorshield/actions/delivery-report.actions';
import { getSupplierCyberPosture } from '~/lib/vendorshield/cyber.server';
import {
  getSupplierActions,
  getSupplierAudits,
} from '~/lib/vendorshield/actions/workflow.actions';

import { BankruptcyPanel } from './_components/bankruptcy-panel';
import { ClimateRiskPanel } from './_components/climate-risk-panel';
import { OperationalPredictionPanel } from './_components/operational-prediction-panel';
import { SupplierDocumentsPanel } from './_components/supplier-documents-panel';
import { SupplierKpiScorecard } from './_components/supplier-kpi-scorecard';
import { SupplierQuestionnairesPanel } from './_components/supplier-questionnaires-panel';
import { SupplierDeliveryReportsPanel } from './_components/supplier-delivery-reports-panel';
import { CyberPosturePanel } from './_components/cyber-posture-panel';
import { SupplierAuditsPanel } from './_components/supplier-audits-panel';
import { SupplierCapaPanel } from './_components/supplier-capa-panel';
import { SupplierAiPanel } from './_components/supplier-ai-panel';
import { SupplierDetail } from './_components/supplier-detail';
import { SupplierTabs } from './_components/supplier-tabs';
import { TierNetworkGraph } from './_components/tier-network-graph';

interface Props {
  params: Promise<{ id: string }>;
}

async function SupplierDetailPage({ params }: Props) {
  const { id } = await params;

  const [
    supplier,
    analyses,
    configStatus,
    predictions,
    scGraph,
    deliveryPrediction,
    kpis,
    compliance,
    questionnaires,
    deliveryReports,
    cyberPosture,
    audits,
    capaActions,
  ] = await Promise.all([
    getSupplierById(id),
    getSupplierAnalyses(id, 5),
    getAiConfigStatus(),
    getSupplierPredictions(id, 4),
    getSupplyChainGraph(id),
    getDeliveryPrediction(id),
    getSupplierKpis(id),
    getSupplierCompliance(id),
    getSupplierQuestionnaires(id),
    getSupplierDeliveryReports(id),
    getSupplierCyberPosture(id),
    getSupplierAudits(id),
    getSupplierActions(id),
  ]);

  if (!supplier) notFound();

  return (
    <>
      <PageHeader title={supplier.name} description={<AppBreadcrumbs />} />
      <PageBody>
        <SupplierTabs
          overview={
            <>
              <SupplierDetail supplier={supplier} />
              <SupplierKpiScorecard kpis={kpis} />
            </>
          }
          risk={
            <>
              <OperationalPredictionPanel supplierId={id} initial={deliveryPrediction} />
              <ClimateRiskPanel supplierId={id} />
              <BankruptcyPanel supplierId={id} predictions={predictions} />
              <SupplierAiPanel supplierId={id} pastAnalyses={analyses} configStatus={configStatus} />
            </>
          }
          compliance={
            <>
              <SupplierDocumentsPanel supplierId={id} compliance={compliance} />
              <CyberPosturePanel posture={cyberPosture} />
            </>
          }
          actions={
            <>
              <SupplierQuestionnairesPanel supplierId={id} requests={questionnaires} />
              <SupplierDeliveryReportsPanel supplierId={id} requests={deliveryReports} />
              <SupplierAuditsPanel supplierId={id} audits={audits} />
              <SupplierCapaPanel supplierId={id} actions={capaActions} />
            </>
          }
          network={
            <section id="supply-chain" className="scroll-mt-16">
              <TierNetworkGraph
                supplierId={id}
                supplierName={supplier.name}
                initialGraph={scGraph}
              />
            </section>
          }
        />
      </PageBody>
    </>
  );
}

export default withI18n(SupplierDetailPage);

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const supplier = await getSupplierById(id);
  return { title: supplier ? `${supplier.name} — Avilyre` : 'Fournisseur' };
}
