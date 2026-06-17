/**
 * Billing config — plans VendorShield.
 *
 * Les `priceId` proviennent des variables d'environnement Stripe afin de
 * pouvoir basculer test/prod sans changer le code. Crée les prix dans le
 * dashboard Stripe puis renseigne les IDs (price_xxx).
 */

export type BillingInterval = 'month' | 'year';

export interface BillingPlanPrice {
  interval: BillingInterval;
  priceId: string | undefined;
  amount: number; // en euros, pour l'affichage
}

export interface BillingPlan {
  id: 'starter' | 'pro' | 'enterprise';
  name: string;
  description: string;
  highlight?: boolean;
  /** Nombre de fournisseurs surveillés inclus (axe de valeur principal). */
  monitoredSuppliers: number | 'unlimited';
  features: string[];
  prices: BillingPlanPrice[];
  /** Plan « nous contacter » : pas de checkout, redirige vers un lien. */
  custom?: boolean;
}

export const billingConfig = {
  currency: 'eur',
  trialDays: 14,
  plans: [
    {
      id: 'starter',
      name: 'Starter',
      description: 'Pour démarrer la surveillance de vos fournisseurs clés.',
      monitoredSuppliers: 50,
      features: [
        "Jusqu'à 50 fournisseurs surveillés",
        '2 utilisateurs',
        'Scoring de risque 4 dimensions',
        'Alertes & règles configurables',
        'Import Excel / CSV',
      ],
      prices: [
        {
          interval: 'month',
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY,
          amount: 290,
        },
        {
          interval: 'year',
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_YEARLY,
          amount: 2900,
        },
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'Surveillance IA et anticipation des défaillances.',
      highlight: true,
      monitoredSuppliers: 250,
      features: [
        "Jusqu'à 250 fournisseurs surveillés",
        '10 utilisateurs',
        'OSINT IA (Claude) & détection de signaux',
        'Prédiction de défaillance fournisseur',
        'Graphe multi-tiers',
        'Exports PDF & analytics avancés',
      ],
      prices: [
        {
          interval: 'month',
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY,
          amount: 890,
        },
        {
          interval: 'year',
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY,
          amount: 8900,
        },
      ],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'Pour les groupes industriels multi-sites.',
      custom: true,
      monitoredSuppliers: 'unlimited',
      features: [
        'Fournisseurs illimités',
        'Utilisateurs illimités',
        'SSO (SAML / OIDC)',
        'Onboarding & support dédiés',
        'SLA & hébergement dédié',
      ],
      prices: [],
    },
  ],
} satisfies {
  currency: string;
  trialDays: number;
  plans: BillingPlan[];
};

export function getPlanByPriceId(priceId: string): BillingPlan | undefined {
  return billingConfig.plans.find((plan) =>
    plan.prices.some((price) => price.priceId === priceId),
  );
}
