import { PageBody, PageHeader } from '@kit/ui/page';
import { Skeleton } from '@kit/ui/skeleton';

export default function SuppliersLoading() {
  return (
    <>
      <PageHeader title="Fournisseurs" description="Chargement...">
        <Skeleton className="h-9 w-36" />
      </PageHeader>

      <PageBody>
        <div className="space-y-3">
          {/* Filters skeleton */}
          <div className="flex gap-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-36" />
          </div>

          {/* Table skeleton */}
          <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
            <div className="border-b border-gray-100 dark:border-gray-800 p-4">
              <div className="grid grid-cols-7 gap-4">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-4" />
                ))}
              </div>
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="border-b border-gray-50 dark:border-gray-800/50 p-4"
              >
                <div className="grid grid-cols-7 gap-4 items-center">
                  <div className="col-span-2 flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Skeleton key={j} className="h-4" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </PageBody>
    </>
  );
}
