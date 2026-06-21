import Link from 'next/link';

import { FileQuestion } from 'lucide-react';

import { Button } from '@kit/ui/button';

/**
 * Page « introuvable » rendue À L'INTÉRIEUR du layout home → la sidebar reste
 * visible (au lieu de remonter au not-found racine plein écran).
 */
export default function HomeNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-center">
      <FileQuestion className="text-muted-foreground h-12 w-12" />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Ressource introuvable</h2>
        <p className="text-muted-foreground max-w-sm text-sm">
          Cette page n'existe pas, a été supprimée, ou ne fait pas partie de votre compte.
        </p>
      </div>
      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/home/suppliers">Fournisseurs</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/home">Tableau de bord</Link>
        </Button>
      </div>
    </div>
  );
}
