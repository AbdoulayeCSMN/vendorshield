'use client';

import Link from 'next/link';

import { AlertTriangle } from 'lucide-react';

import { Button } from '@kit/ui/button';

/**
 * Frontière d'erreur du segment home — rendue dans le layout (sidebar conservée)
 * pour toute route home sans error.tsx dédié.
 */
export default function HomeError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-center">
      <AlertTriangle className="h-12 w-12 text-amber-500" />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Une erreur est survenue</h2>
        <p className="text-muted-foreground max-w-sm text-sm">
          Impossible d'afficher cette page pour le moment. Réessayez, ou revenez au tableau
          de bord.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => reset()}>
          Réessayer
        </Button>
        <Button asChild size="sm">
          <Link href="/home">Tableau de bord</Link>
        </Button>
      </div>
    </div>
  );
}
