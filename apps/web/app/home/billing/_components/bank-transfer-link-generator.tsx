'use client';

import { useState } from 'react';

import { Copy } from 'lucide-react';
import { toast } from 'sonner';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';

import { billingConfig } from '~/config/billing.config';

/**
 * Génère un lien public /pay (coordonnées bancaires + référence) pour un
 * prospect, sans dépendre de Stripe. Chemin de paiement disponible
 * immédiatement (vente par virement) en attendant l'activation de Stripe.
 */
export function BankTransferLinkGenerator() {
  const [email, setEmail] = useState('');

  function copy(planId: string, interval: 'month' | 'year') {
    const url = new URL('/pay', window.location.origin);
    url.searchParams.set('plan', planId);
    url.searchParams.set('interval', interval);
    if (email.trim()) url.searchParams.set('email', email.trim());
    navigator.clipboard.writeText(url.toString());
    toast.success('Lien copié dans le presse-papiers.');
  }

  const plans = billingConfig.plans.filter((p) => !p.custom);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lien de paiement par virement</CardTitle>
        <CardDescription>
          Disponible dès maintenant, sans Stripe. Renseignez l&apos;email du
          prospect, copiez le lien du plan choisi et envoyez-le par email ou
          dans un devis : il affiche vos coordonnées bancaires et une
          référence pour rattacher le virement à son compte. Activez ensuite
          l&apos;abonnement dans{' '}
          <a href="/home/billing/admin" className="underline">
            Activation manuelle
          </a>
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="prospect-email-transfer">Email du prospect</Label>
          <Input
            id="prospect-email-transfer"
            type="email"
            placeholder="prospect@entreprise.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          {plans.flatMap((plan) =>
            plan.prices.map((price) => (
              <div
                key={`${plan.id}-${price.interval}`}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <span className="text-sm font-medium">
                  {plan.name} ·{' '}
                  {price.interval === 'month' ? 'mensuel' : 'annuel'} (
                  {price.amount.toLocaleString('fr-FR')} €)
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copy(plan.id, price.interval)}
                >
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  Copier le lien
                </Button>
              </div>
            )),
          )}
        </div>
      </CardContent>
    </Card>
  );
}
