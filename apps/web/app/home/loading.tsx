import { PageBody, PageHeader } from '@kit/ui/page';
import { Skeleton } from '@kit/ui/skeleton';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';

export default async function HomeLoading() {
  const { t } = await createI18nServerInstance();

  return (
    <>
      <PageHeader
        title={t('pages.dashboard', { ns: 'vendorshield' })}
        description={t('pages.dashboardDesc', { ns: 'vendorshield' })}
      />
      <PageBody>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl lg:col-span-2" />
          </div>

          <Skeleton className="h-64 rounded-xl" />
        </div>
      </PageBody>
    </>
  );
}
