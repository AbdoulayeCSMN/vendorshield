import { notFound } from 'next/navigation';

import { PageBody, PageHeader } from '@kit/ui/page';
import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';

import { withI18n } from '~/lib/i18n/with-i18n';
import {
  getAiConfigStatus,
  getSupplierAnalyses,
} from '~/lib/vendorshield/actions/ai.actions';
import { getSupplierPredictions } from '~/lib/vendorshield/actions/prediction.actions';
import { getSupplierById } from '~/lib/vendorshield/suppliers.server';

import { BankruptcyPanel } from './_components/bankruptcy-panel';
import { SupplierAiPanel } from './_components/supplier-ai-panel';
import { SupplierDetail } from './_components/supplier-detail';

interface Props {
  params: Promise<{ id: string }>;
}

async function SupplierDetailPage({ params }: Props) {
  const { id } = await params;

  const [supplier, analyses, configStatus, predictions] = await Promise.all([
    getSupplierById(id),
    getSupplierAnalyses(id, 5),
    getAiConfigStatus(),
    getSupplierPredictions(id, 4),
  ]);

  if (!supplier) notFound();

  return (
    <>
      <PageHeader title={supplier.name} description={<AppBreadcrumbs />} />
      <PageBody>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Contenu principal */}
          <div className="xl:col-span-2">
            <SupplierDetail supplier={supplier} />
          </div>

          {/* Sidebar IA */}
          <div className="space-y-4">
            <BankruptcyPanel
              supplierId={id}
              predictions={predictions}
            />
            <SupplierAiPanel
              supplierId={id}
              pastAnalyses={analyses}
              configStatus={configStatus}
            />
          </div>
        </div>
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
