'use client';

import { Button } from '@kit/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function AlertsErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error('[Alerts Error]', error);

  return (
    <div className="min-h-64 flex flex-col items-center justify-center gap-4 p-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-950">
        <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
      </div>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Une erreur est survenue</p>
      <p className="text-xs text-gray-400 text-center max-w-sm">{error.message}</p>
      <Button size="sm" onClick={reset} variant="outline">Réessayer</Button>
    </div>
  );
}
