'use client';

import { useState } from 'react';

import { Check, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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

const CONTACT_EMAIL = 'a.chaibou.tech@gmail.com';
const ACTIVE_STATUSES = ['active', 'trialing'];

export function BillingPlans({
  subscription,
}: {
  subscription: BillingSubscription | null;
}) {
  const { t, i18n } = useTranslation('billing');
  const numberLocale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
  const dateLocale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';

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
      throw new Error(json.error || t('plansPage.genericError'));
    }
    window.location.href = json.url as string;
  }

  async function subscribe(plan: BillingPlan) {
    const price = plan.prices.find((p) => p.interval === interval);
    if (!price?.paddlePriceId) {
      toast.error(t('plansPage.priceNotConfigured'));
      return;
    }
    try {
      setLoadingId(plan.id);
      await post('/api/billing/paddle/checkout', { priceId: price.paddlePriceId });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('plansPage.genericPaymentError'));
      setLoadingId(null);
    }
  }

  async function manage() {
    try {
      setLoadingId('manage');
      await post('/api/billing/paddle/portal');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('plansPage.genericError'));
      setLoadingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {hasActiveSub ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t('plansPage.activeSubscriptionTitle')}
              <Badge variant="default" className="capitalize">
                {subscription?.plan ?? 'pro'}
              </Badge>
            </CardTitle>
            <CardDescription>
              {t('plansPage.statusLabel')} : {subscription?.status}
              {subscription?.current_period_end
                ? ` · ${t('plansPage.renewsOn', {
                    date: new Date(
                      subscription.current_period_end,
                    ).toLocaleDateString(dateLocale),
                  })}`
                : null}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={manage} disabled={loadingId === 'manage'}>
              {loadingId === 'manage' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t('plansPage.manageSubscription')}
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
            {t('plansPage.monthly')}
          </button>
          <button
            type="button"
            onClick={() => setInterval('year')}
            className={`rounded-md px-3 py-1 ${interval === 'year' ? 'bg-background text-foreground shadow-sm' : ''}`}
          >
            {t('plansPage.yearly')}{' '}
            <span className="text-xs">{t('plansPage.yearlyDiscount')}</span>
          </button>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {billingConfig.plans.map((plan) => {
          const price = plan.prices.find((p) => p.interval === interval);
          const isCurrent = hasActiveSub && subscription?.plan === plan.id;
          const name = t(`plans.${plan.id}.name`);
          const description = t(`plans.${plan.id}.description`);
          const features = t(`plans.${plan.id}.features`, {
            returnObjects: true,
          }) as string[];

          return (
            <Card
              key={plan.id}
              className={plan.highlight ? 'border-primary shadow-md' : ''}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {name}
                  {plan.highlight ? (
                    <Badge variant="secondary">
                      {t('plansPage.popularBadge')}
                    </Badge>
                  ) : null}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
                <div className="pt-2">
                  {plan.custom ? (
                    <span className="text-2xl font-bold">
                      {t('plansPage.customPrice')}
                    </span>
                  ) : (
                    <span className="text-3xl font-bold">
                      {price?.amount.toLocaleString(numberLocale)} €
                      <span className="text-muted-foreground text-sm font-normal">
                        {' '}
                        {interval === 'month'
                          ? t('plansPage.perMonth')
                          : t('plansPage.perYear')}
                      </span>
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="flex flex-col gap-2 text-sm">
                  {features.map((f) => (
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
                      {t('plansPage.contactCta')}
                    </a>
                  </Button>
                ) : isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    {t('plansPage.currentPlan')}
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
                    {hasActiveSub
                      ? t('plansPage.changeViaPortal')
                      : t('plansPage.subscribeCta')}
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
