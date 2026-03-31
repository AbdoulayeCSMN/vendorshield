import { PageBody, PageHeader } from '@kit/ui/page';
import { Skeleton } from '@kit/ui/skeleton';

export default function AnalyticsLoading() {
  return (
    <>
      <PageHeader title="Risk Analytics" description="Chargement..." />
      <PageBody>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
          <Skeleton className="h-64 rounded-xl" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Skeleton className="h-80 rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
          </div>
        </div>
      </PageBody>
    </>
  );
}
