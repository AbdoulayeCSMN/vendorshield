import Link from 'next/link';

import { CircleAlert, Sparkles } from 'lucide-react';

import { Button } from '@kit/ui/button';

import type { BillingGate } from '~/lib/billing/gate.server';

export function BillingStatusBanner({ gate }: { gate: BillingGate }) {
  if (!gate.upgradeMessage) return null;

  const urgent = gate.status === 'free' || gate.atSupplierLimit;

  return (
    <div className="px-4 pt-4 lg:px-6 lg:pt-5">
      <div
        className={`flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
          urgent
            ? 'border-orange-200 bg-orange-50'
            : 'border-blue-200 bg-blue-50'
        }`}
      >
        <div className="min-w-0">
          <p
            className={`flex items-center gap-2 text-sm font-semibold ${
              urgent ? 'text-orange-800' : 'text-blue-800'
            }`}
          >
            {urgent ? (
              <CircleAlert className="h-4 w-4 shrink-0" />
            ) : (
              <Sparkles className="h-4 w-4 shrink-0" />
            )}
            {urgent ? 'Action requise' : 'Essai gratuit'}
          </p>
          <p
            className={`mt-0.5 text-xs ${urgent ? 'text-orange-700' : 'text-blue-700'}`}
          >
            {gate.upgradeMessage}
          </p>
        </div>

        <Button
          asChild
          size="sm"
          variant={urgent ? 'default' : 'outline'}
          className={urgent ? '' : 'border-blue-300 bg-white text-blue-800 hover:bg-blue-100'}
        >
          <Link href="/home/billing">Voir les plans</Link>
        </Button>
      </div>
    </div>
  );
}
