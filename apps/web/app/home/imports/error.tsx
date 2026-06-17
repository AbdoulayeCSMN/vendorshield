'use client';
import { Button } from '@kit/ui/button';

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-64 gap-4 p-8">
      <p className="text-sm font-medium text-gray-700">Une erreur est survenue</p>
      <p className="text-xs text-gray-400 text-center max-w-sm">{error.message}</p>
      <Button size="sm" onClick={reset} variant="outline">Réessayer</Button>
    </div>
  );
}
