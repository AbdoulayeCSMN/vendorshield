import Link from 'next/link';

import { FlaskConical } from 'lucide-react';

import { Button } from '@kit/ui/button';

export function DemoModeBanner() {
  return (
    <div className="px-4 pt-4 lg:px-6 lg:pt-5">
      <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-800">
            <FlaskConical className="h-4 w-4 shrink-0" />
            Mode démo actif
          </p>
          <p className="mt-0.5 text-xs text-amber-700">
            Vous visualisez des données de démonstration. Quittez le mode démo pour revenir à vos données réelles.
          </p>
        </div>

        <Button asChild variant="outline" size="sm" className="border-amber-300 bg-white text-amber-800 hover:bg-amber-100">
          <Link href="/demo/exit">Utiliser mes données</Link>
        </Button>
      </div>
    </div>
  );
}