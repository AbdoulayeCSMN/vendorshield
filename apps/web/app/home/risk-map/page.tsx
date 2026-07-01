import Link from 'next/link';

import { PageBody, PageHeader } from '@kit/ui/page';
import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { getRiskMatrix } from '~/lib/vendorshield/analytics.server';

import { RiskMatrix } from './_components/risk-matrix';

async function RiskMapPage() {
  const { t } = await createI18nServerInstance();
  const points = await getRiskMatrix();

  // Quadrant prioritaire : forte probabilité ET fort impact.
  const priorities = points
    .filter((p) => p.likelihood > 50 && p.impact > 50)
    .sort((a, b) => b.likelihood + b.impact - (a.likelihood + a.impact))
    .slice(0, 8);

  return (
    <>
      <PageHeader
        title={t('vendorshield:pages.riskMap')}
        description={<AppBreadcrumbs />}
      />
      <PageBody>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <RiskMatrix points={points} />
          </div>

          <div className="rounded-xl border p-4">
            <h2 className="text-sm font-semibold">
              {t('vendorshield:pages.riskMapPriorities', { count: priorities.length })}
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {t('vendorshield:pages.riskMapPrioritiesDesc')}
            </p>
            <ul className="mt-3 space-y-2">
              {priorities.length === 0 && (
                <li className="text-muted-foreground text-sm">
                  {t('vendorshield:pages.riskMapEmpty')}
                </li>
              )}
              {priorities.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/home/suppliers/${p.id}`}
                    className="hover:bg-muted flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors"
                  >
                    <span className="truncate font-medium">{p.name}</span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      P{p.likelihood} · I{p.impact}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(RiskMapPage);
