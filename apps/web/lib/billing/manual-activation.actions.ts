'use server';

import { revalidatePath } from 'next/cache';

import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { billingConfig } from '~/config/billing.config';

import { isSuperAdmin } from './admin.server';

type ActionResult =
  | { success: true; message: string }
  | { success: false; error: string };

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Active manuellement un abonnement après réception d'un virement bancaire
 * (chemin de paiement sans Stripe). Réservé aux emails listés dans
 * `SUPER_ADMIN_EMAILS` — il n'y a pas de système de rôles dans l'app.
 */
export async function activateSubscriptionManuallyAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);

  if (auth.error) {
    return { success: false, error: 'Non authentifié' };
  }

  if (!isSuperAdmin(auth.data.email as string | undefined)) {
    return { success: false, error: 'Non autorisé' };
  }

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const planId = String(formData.get('plan') ?? '');
  const interval = String(formData.get('interval') ?? 'month');

  if (!email) {
    return { success: false, error: 'Email requis' };
  }

  const plan = billingConfig.plans.find((p) => p.id === planId);
  if (!plan) {
    return { success: false, error: 'Plan invalide' };
  }

  const admin = getSupabaseServerAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: account } = await (admin as any)
    .from('accounts')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (!account) {
    return {
      success: false,
      error: `Aucun compte trouvé avec l'email ${email}. Le prospect doit d'abord créer un compte VendorShield.`,
    };
  }

  const periodDays = interval === 'year' ? 365 : 30;
  const currentPeriodEnd = new Date(Date.now() + periodDays * DAY_MS).toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from('billing_subscriptions').upsert(
    {
      account_id: account.id,
      plan: plan.id,
      status: 'active',
      quantity: 1,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: false,
    },
    { onConflict: 'account_id' },
  );

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/home/billing/admin');

  return {
    success: true,
    message: `Abonnement ${plan.name} activé pour ${email} jusqu'au ${new Date(currentPeriodEnd).toLocaleDateString('fr-FR')}.`,
  };
}
