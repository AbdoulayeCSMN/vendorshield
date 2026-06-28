'use client';

import { useState } from 'react';

import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';

import {
  type BillingInterval,
  type BillingPlan,
  billingConfig,
} from '~/config/billing.config';
import type { BillingSubscription } from '~/lib/billing/billing.server';

const CONTACT_EMAIL = 'contact@vendorshield.io';
const ACTIVE_STATUSES = ['active', 'trialing'];

export function BillingPlans({
  subscription,
}: {
  subscription: BillingSubscription | null;
}) {
  const [interval, setInterval] = useState<BillingInterval>('month');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const hasActiveSub =
    !!subscription && ACTIVE_STATUSES.includes(subscription.status);

  async function post(url: string, body?: unknown) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.url) {
      throw new Error(json.error || 'Une erreur est survenue.');
    }
    window.location.href = json.url as string;
  }

  async function subscribe(plan: BillingPlan) {
    const price = plan.prices.find((p) => p.interval === interval);
    if (!price?.paddlePriceId) {
      toast.error(
        'Ce tarif n’est pas encore configuré (price ID Paddle manquant).',
      );
      return;
    }
    try {
      setLoadingId(plan.id);
      await post('/api/billing/paddle/checkout', { priceId: price.paddlePriceId });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Échec du paiement.');
      setLoadingId(null);
    }
  }

  async function manage() {
    try {
      setLoadingId('manage');
      await post('/api/billing/paddle/portal');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Échec.');
      setLoadingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {hasActiveSub ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Abonnement actif
              <Badge variant="default" className="capitalize">
                {subscription?.plan ?? 'pro'}
              </Badge>
            </CardTitle>
            <CardDescription>
              Statut : {subscription?.status}
              {subscription?.current_period_end
                ? ` · renouvellement le ${new Date(
                    subscription.current_period_end,
                  ).toLocaleDateString('fr-FR')}`
                : null}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={manage} disabled={loadingId === 'manage'}>
              {loadingId === 'manage' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Gérer mon abonnement
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="bg-muted text-muted-foreground inline-flex w-fit items-center gap-2 rounded-lg p-1 text-sm">
          <button
            type="button"
            onClick={() => setInterval('month')}
            className={`rounded-md px-3 py-1 ${interval === 'month' ? 'bg-background text-foreground shadow-sm' : ''}`}
          >
            Mensuel
          </button>
          <button
            type="button"
            onClick={() => setInterval('year')}
            className={`rounded-md px-3 py-1 ${interval === 'year' ? 'bg-background text-foreground shadow-sm' : ''}`}
          >
            Annuel <span className="text-xs">(2 mois offerts)</span>
          </button>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {billingConfig.plans.map((plan) => {
          const price = plan.prices.find((p) => p.interval === interval);
          const isCurrent = hasActiveSub && subscription?.plan === plan.id;

          return (
            <Card
              key={plan.id}
              className={plan.highlight ? 'border-primary shadow-md' : ''}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  {plan.highlight ? (
                    <Badge variant="secondary">Populaire</Badge>
                  ) : null}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="pt-2">
                  {plan.custom ? (
                    <span className="text-2xl font-bold">Sur devis</span>
                  ) : (
                    <span className="text-3xl font-bold">
                      {price?.amount.toLocaleString('fr-FR')} €
                      <span className="text-muted-foreground text-sm font-normal">
                        {' '}
                        /{interval === 'month' ? 'mois' : 'an'}
                      </span>
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="flex flex-col gap-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {plan.custom ? (
                  <Button variant="outline" className="w-full" asChild>
                    <a href={`mailto:${CONTACT_EMAIL}?subject=VendorShield Enterprise`}>
                      Nous contacter
                    </a>
                  </Button>
                ) : isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    Plan actuel
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.highlight ? 'default' : 'outline'}
                    disabled={loadingId === plan.id || hasActiveSub}
                    onClick={() => subscribe(plan)}
                  >
                    {loadingId === plan.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {hasActiveSub ? 'Changer via le portail' : "S'abonner"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
