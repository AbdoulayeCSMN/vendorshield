import 'server-only';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { billingConfig } from '~/config/billing.config';

import { getSubscriptionForAccount, isSubscriptionActive } from './billing.server';

const TRIAL_DAYS = billingConfig.trialDays;
// Plan implicite appliqué pendant l'essai (avant tout passage par Stripe Checkout).
const TRIAL_PLAN_ID = 'starter';
// Limite perpétuelle pour les comptes sans abonnement, essai expiré (pas de blocage dur,
// juste un quota bas qui force le passage à un plan payant pour grandir).
const FREE_TIER_SUPPLIER_LIMIT = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface BillingGate {
  status: 'active' | 'trialing' | 'free';
  plan: string | null;
  trialEndsAt: string;
  trialDaysLeft: number;
  supplierLimit: number | null; // null = illimité
  supplierCount: number;
  atSupplierLimit: boolean;
  upgradeMessage: string | null;
}

/**
 * Calcule l'état d'abonnement effectif d'un compte : essai (basé sur la date de
 * création du compte, sans carte requise), plan payant actif, ou palier gratuit
 * perpétuel après expiration de l'essai. Sert à la fois à l'affichage (bannière)
 * et à l'application des quotas dans les Server Actions.
 */
export async function getBillingGate(accountId: string): Promise<BillingGate> {
  const client = getSupabaseServerClient();

  const [subscription, accountRes, countRes] = await Promise.all([
    getSubscriptionForAccount(accountId),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (client as any)
      .from('accounts')
      .select('created_at')
      .eq('id', accountId)
      .single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (client as any)
      .from('suppliers')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .neq('status', 'blacklisted'),
  ]);

  const active = isSubscriptionActive(subscription);

  const createdAt = accountRes.data?.created_at
    ? new Date(accountRes.data.created_at as string)
    : new Date();
  const trialEndsAt = new Date(createdAt.getTime() + TRIAL_DAYS * DAY_MS);
  const trialActive = !active && Date.now() < trialEndsAt.getTime();

  const planConfig = active
    ? billingConfig.plans.find((p) => p.id === subscription?.plan)
    : trialActive
      ? billingConfig.plans.find((p) => p.id === TRIAL_PLAN_ID)
      : null;

  const supplierLimit = planConfig
    ? planConfig.monitoredSuppliers === 'unlimited'
      ? null
      : planConfig.monitoredSuppliers
    : FREE_TIER_SUPPLIER_LIMIT;

  const supplierCount = countRes.count ?? 0;
  const atSupplierLimit = supplierLimit !== null && supplierCount >= supplierLimit;

  const status: BillingGate['status'] = active ? 'active' : trialActive ? 'trialing' : 'free';
  const trialDaysLeft = Math.max(
    0,
    Math.ceil((trialEndsAt.getTime() - Date.now()) / DAY_MS),
  );

  let upgradeMessage: string | null = null;
  if (atSupplierLimit) {
    upgradeMessage = `Vous suivez ${supplierCount} fournisseur${supplierCount > 1 ? 's' : ''}, la limite de votre offre actuelle (${supplierLimit}). Passez à un plan supérieur pour en ajouter.`;
  } else if (status === 'trialing' && trialDaysLeft <= 3) {
    upgradeMessage = `Votre essai gratuit se termine dans ${trialDaysLeft} jour${trialDaysLeft > 1 ? 's' : ''}. Abonnez-vous pour ne rien perdre.`;
  } else if (status === 'free') {
    upgradeMessage = `Votre essai gratuit est terminé. Vous pouvez continuer à consulter vos ${supplierCount} fournisseur${supplierCount > 1 ? 's' : ''}, mais l'ajout est limité à ${FREE_TIER_SUPPLIER_LIMIT} sans abonnement.`;
  }

  return {
    status,
    plan: active ? subscription?.plan ?? null : trialActive ? TRIAL_PLAN_ID : null,
    trialEndsAt: trialEndsAt.toISOString(),
    trialDaysLeft,
    supplierLimit,
    supplierCount,
    atSupplierLimit,
    upgradeMessage,
  };
}

/**
 * Garde-fou pour les Server Actions qui créent un ou plusieurs fournisseurs
 * (même convention que `denyIfDemo` : retourne un ActionResult d'erreur si le
 * quota du plan serait dépassé, sinon `null`).
 */
export function assertCanAddSuppliers(
  gate: BillingGate,
  additionalCount = 1,
): { success: false; error: string } | null {
  if (
    gate.supplierLimit !== null &&
    gate.supplierCount + additionalCount > gate.supplierLimit
  ) {
    return {
      success: false,
      error:
        gate.upgradeMessage ??
        `Limite de ${gate.supplierLimit} fournisseurs atteinte pour votre offre. Passez à un plan supérieur dans Facturation pour continuer.`,
    };
  }
  return null;
}
