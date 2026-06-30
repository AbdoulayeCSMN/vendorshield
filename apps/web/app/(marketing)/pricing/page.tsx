import Link from 'next/link';

import { Check } from 'lucide-react';

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

import { SitePageHeader } from '~/(marketing)/_components/site-page-header';
import { billingConfig } from '~/config/billing.config';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

const CONTACT_EMAIL = 'a.chaibou.tech@gmail.com';

export async function generateMetadata() {
  const { t } = await createI18nServerInstance();

  return {
    title: t('marketing:pricing'),
  };
}

async function PricingPage() {
  const { t, language } = await createI18nServerInstance();
  const numberLocale = language === 'fr' ? 'fr-FR' : 'en-US';

  return (
    <div className={'flex flex-col space-y-4 xl:space-y-8'}>
      <SitePageHeader
        title={t('marketing:pricing')}
        subtitle={t('marketing:pricingSubtitle')}
      />

      <div className={'container mx-auto pb-16'}>
        <div className="grid gap-6 md:grid-cols-3">
          {billingConfig.plans.map((plan) => {
            const monthlyPrice = plan.prices.find(
              (p) => p.interval === 'month',
            );
            const name = t(`billing:plans.${plan.id}.name`);
            const description = t(`billing:plans.${plan.id}.description`);
            const features = t(`billing:plans.${plan.id}.features`, {
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
                        {t('marketing:pricingPage.popularBadge')}
                      </Badge>
                    ) : null}
                  </CardTitle>
                  <CardDescription>{description}</CardDescription>
                  <div className="pt-2">
                    {plan.custom ? (
                      <span className="text-2xl font-bold">
                        {t('marketing:pricingPage.customPrice')}
                      </span>
                    ) : (
                      <span className="text-3xl font-bold">
                        {monthlyPrice?.amount.toLocaleString(numberLocale)} €
                        <span className="text-muted-foreground text-sm font-normal">
                          {' '}
                          {t('marketing:pricingPage.perMonth')}
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
                      <a href={`mailto:${CONTACT_EMAIL}?subject=Avilyre Enterprise`}>
                        {t('marketing:pricingPage.contactCta')}
                      </a>
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={plan.highlight ? 'default' : 'outline'}
                      asChild
                    >
                      <Link href="/auth/sign-up">{t('marketing:ctaStartFree')}</Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <p className="text-muted-foreground mt-8 text-center text-sm">
          {t('marketing:pricingPage.footerNote')}
        </p>
      </div>
    </div>
  );
}

export default withI18n(PricingPage);
