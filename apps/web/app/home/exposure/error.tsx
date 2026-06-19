'use client';

import { AlertTriangle } from 'lucide-react';

import { Button } from '@kit/ui/button';

export default function ExposureErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error('[Exposure Error]', error);

  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-4 p-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-950">
        <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
      </div>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Une erreur est survenue</p>
      <p className="max-w-sm text-center text-xs text-gray-400">{error.message}</p>
      <Button size="sm" onClick={reset} variant="outline">
        Réessayer
      </Button>
    </div>
  );
}
