/**
 * Billing config — plans Avilyre.
 *
 * Les `priceId` proviennent des variables d'environnement Stripe afin de
 * pouvoir basculer test/prod sans changer le code. Crée les prix dans le
 * dashboard Stripe puis renseigne les IDs (price_xxx).
 */

export type BillingInterval = 'month' | 'year';

export interface BillingPlanPrice {
  interval: BillingInterval;
  /**
   * Identifiant de prix Paddle (Dashboard Paddle → Catalog → Prices),
   * chemin de paiement automatisé actif (voir /api/billing/paddle/*).
   */
  paddlePriceId: string | undefined;
  /** Stripe — conservé éteint (compte Stripe indisponible, voir mémoire). */
  priceId: string | undefined;
  /**
   * URL d'un Stripe Payment Link pré-créé pour ce prix (Dashboard Stripe →
   * Payment Links). Permet d'envoyer un lien de paiement à un prospect sans
   * passer par le checkout in-app (vente assistée). On y ajoute
   * `?prefilled_email=` côté client pour rattacher le paiement au bon compte
   * (voir webhook : résolution par email si `client_reference_id` absent).
   */
  paymentLinkUrl: string | undefined;
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
          paddlePriceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_STARTER_MONTHLY,
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY,
          paymentLinkUrl: process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_STARTER_MONTHLY,
          amount: 290,
        },
        {
          interval: 'year',
          paddlePriceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_STARTER_YEARLY,
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_YEARLY,
          paymentLinkUrl: process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_STARTER_YEARLY,
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
          paddlePriceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY,
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY,
          paymentLinkUrl: process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PRO_MONTHLY,
          amount: 990,
        },
        {
          interval: 'year',
          paddlePriceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_YEARLY,
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY,
          paymentLinkUrl: process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PRO_YEARLY,
          amount: 9900,
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

export function getPlanByPaddlePriceId(paddlePriceId: string): BillingPlan | undefined {
  return billingConfig.plans.find((plan) =>
    plan.prices.some((price) => price.paddlePriceId === paddlePriceId),
  );
}

export function getPlan(id: string): BillingPlan | undefined {
  return billingConfig.plans.find((plan) => plan.id === id);
}

export function getPlanPrice(
  id: string,
  interval: BillingInterval,
): BillingPlanPrice | undefined {
  return getPlan(id)?.prices.find((price) => price.interval === interval);
}

/**
 * Coordonnées bancaires pour la facturation par virement — chemin de
 * paiement sans Stripe (le founder n'a pas encore de compte Stripe actif,
 * ex. pays non supporté). Non sensible : destiné à être communiqué aux
 * prospects, donc en variables `NEXT_PUBLIC_*`.
 */
export const bankTransferConfig = {
  accountHolder: process.env.NEXT_PUBLIC_BANK_ACCOUNT_HOLDER,
  iban: process.env.NEXT_PUBLIC_BANK_IBAN,
  bic: process.env.NEXT_PUBLIC_BANK_BIC,
  bankName: process.env.NEXT_PUBLIC_BANK_NAME,
};

export function isBankTransferConfigured(): boolean {
  return !!(bankTransferConfig.iban && bankTransferConfig.accountHolder);
}
