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
 * Génère un lien de paiement Stripe (Payment Link) pré-rempli avec l'email
 * d'un prospect, pour la vente assistée (envoi par email/devis plutôt que
 * checkout in-app). Le webhook rattache l'abonnement au compte correspondant
 * par email si le prospect n'a pas encore de session active au moment du
 * paiement (voir /api/billing/webhook).
 */
export function PaymentLinkGenerator() {
  const [email, setEmail] = useState('');

  const links = billingConfig.plans
    .flatMap((plan) =>
      plan.prices.map((price) => ({
        label: `${plan.name} · ${price.interval === 'month' ? 'mensuel' : 'annuel'}`,
        url: price.paymentLinkUrl,
      })),
    )
    .filter((link) => !!link.url);

  function copy(url: string) {
    const target = new URL(url);
    if (email.trim()) {
      target.searchParams.set('prefilled_email', email.trim());
    }
    navigator.clipboard.writeText(target.toString());
    toast.success('Lien copié dans le presse-papiers.');
  }

  if (links.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lien de paiement à partager</CardTitle>
        <CardDescription>
          Pour une vente assistée : renseignez l&apos;email du prospect, copiez le
          lien du plan correspondant et envoyez-le par email ou dans un devis.
          Le paiement sera automatiquement rattaché à son compte par email.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="prospect-email">Email du prospect</Label>
          <Input
            id="prospect-email"
            type="email"
            placeholder="prospect@entreprise.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          {links.map((link) => (
            <div
              key={link.label}
              className="flex items-center justify-between rounded-lg border px-3 py-2"
            >
              <span className="text-sm font-medium">{link.label}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copy(link.url as string)}
              >
                <Copy className="mr-2 h-3.5 w-3.5" />
                Copier le lien
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
