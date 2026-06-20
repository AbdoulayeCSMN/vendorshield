import Link from 'next/link';

import { PlusIcon } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { PageBody, PageHeader } from '@kit/ui/page';

import { withI18n } from '~/lib/i18n/with-i18n';
import type { AlertSeverity, AlertStatus } from '~/lib/vendorshield/types';
import {
  getAlerts,
  getAlertsKpis,
  type AlertsFilters,
} from '~/lib/vendorshield/alerts.server';

import { AlertsKpiBar } from './_components/alerts-kpi-bar';
import { AlertsList } from './_components/alerts-list';
import { ScanButton } from './_components/scan-button';

interface Props {
  searchParams: Promise<{
    status?: string;
    severity?: string;
    supplier_id?: string;
    page?: string;
  }>;
}

async function AlertsPage({ searchParams }: Props) {
  const params = await searchParams;

  const filters: AlertsFilters = {
    status: params.status as AlertStatus | undefined,
    severity: params.severity as AlertSeverity | undefined,
    supplier_id: params.supplier_id,
    sort: 'created_at',
    order: 'desc',
    page: params.page ? parseInt(params.page, 10) : 1,
    limit: 30,
  };

  const [{ alerts, total, page, pageCount }, kpis] = await Promise.all([
    getAlerts(filters),
    getAlertsKpis(),
  ]);

  return (
    <>
      <PageHeader
        title="Alertes"
        description={`${kpis.open_total} alerte${kpis.open_total !== 1 ? 's' : ''} ouvertes`}
      >
        <div className="flex gap-2">
          <ScanButton />
          <Button asChild variant="outline" size="sm">
            <Link href="/home/alerts/rules">Règles</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/home/alerts/new">
              <PlusIcon className="mr-1.5 h-4 w-4" />
              Alerte manuelle
            </Link>
          </Button>
        </div>
      </PageHeader>

      <PageBody>
        <div className="space-y-5">
          <AlertsKpiBar kpis={kpis} />
          <AlertsList
            alerts={alerts}
            total={total}
            page={page}
            pageCount={pageCount}
            filters={filters}
          />
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(AlertsPage);
