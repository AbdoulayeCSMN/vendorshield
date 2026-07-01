import Link from 'next/link';

import { PlusIcon } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { PageBody, PageHeader } from '@kit/ui/page';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import type {
  RiskLevel,
  SupplierCategory,
  SupplierCriticality,
  SupplierStatus,
} from '~/lib/vendorshield/types';
import {
  getSuppliers,
  type SuppliersFilters,
} from '~/lib/vendorshield/suppliers.server';

import { ExportButton } from '~/home/_components/export-button';
import { RetrainPredictionsButton } from './_components/retrain-predictions-button';
import { SuppliersTable } from './_components/suppliers-table';

interface SuppliersPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    risk_level?: string;
    category?: string;
    criticality?: string;
    sort?: string;
    order?: string;
    page?: string;
  }>;
}

async function SuppliersPage({ searchParams }: SuppliersPageProps) {
  const { t } = await createI18nServerInstance();
  const params = await searchParams;

  const filters: SuppliersFilters = {
    q: params.q,
    status: params.status as SupplierStatus | undefined,
    risk_level: params.risk_level as RiskLevel | undefined,
    category: params.category as SupplierCategory | undefined,
    criticality: params.criticality as SupplierCriticality | undefined,
    sort: (params.sort as SuppliersFilters['sort']) ?? 'global_score',
    order: (params.order as 'asc' | 'desc') ?? 'asc',
    page: params.page ? parseInt(params.page, 10) : 1,
    limit: 25,
  };

  const { suppliers, total, page, pageCount } = await getSuppliers(filters);

  return (
    <>
      <PageHeader
        title={t('vendorshield:pages.suppliers')}
        description={t('vendorshield:pages.suppliersDesc', { count: total })}
      >
        <div className="flex items-center gap-2">
          <RetrainPredictionsButton />
          <ExportButton context="suppliers" label={t('vendorshield:common.export')} />
          <Button asChild size="sm">
            <Link href="/home/suppliers/new">
              <PlusIcon className="mr-1.5 h-4 w-4" />
              {t('vendorshield:pages.suppliersNew')}
            </Link>
          </Button>
        </div>
      </PageHeader>

      <PageBody>
        <SuppliersTable
          suppliers={suppliers}
          total={total}
          page={page}
          pageCount={pageCount}
          filters={filters}
        />
      </PageBody>
    </>
  );
}

export default withI18n(SuppliersPage);
