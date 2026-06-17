import 'server-only';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export interface BillingSubscription {
  account_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: string | null;
  status: string;
  quantity: number;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

const ACTIVE_STATUSES = ['active', 'trialing'];

/**
 * Récupère l'abonnement du compte courant (ou null s'il n'en a pas).
 */
export async function getSubscriptionForAccount(
  accountId: string,
): Promise<BillingSubscription | null> {
  const client = getSupabaseServerClient();

  const { data } = await (client as any)
    .from('billing_subscriptions')
    .select('*')
    .eq('account_id', accountId)
    .maybeSingle();

  return (data as BillingSubscription) ?? null;
}

export function isSubscriptionActive(
  subscription: BillingSubscription | null,
): boolean {
  return !!subscription && ACTIVE_STATUSES.includes(subscription.status);
}
