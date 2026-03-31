import { PageBody, PageHeader } from '@kit/ui/page';
import { Skeleton } from '@kit/ui/skeleton';

export default function HomeLoading() {
  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de vos risques fournisseurs"
      />
      <PageBody>
        <div className="space-y-6">
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>

          {/* Distribution + Alertes */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl lg:col-span-2" />
          </div>

          {/* Table fournisseurs */}
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </PageBody>
    </>
  );
}
