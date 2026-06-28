/**
 * POST /api/billing/paddle/webhook
 * Reçoit les événements Paddle et synchronise la table billing_subscriptions.
 *
 * Configurer dans Dashboard Paddle → Developer tools → Notifications :
 *   endpoint: https://<domaine>/api/billing/paddle/webhook
 *   events:   subscription.created, subscription.updated, subscription.canceled
 */

import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { getPlanByPaddlePriceId } from '~/config/billing.config';
import { getPaddleCustomer } from '~/lib/billing/paddle';
import { verifyPaddleSignature } from '~/lib/billing/paddle-signature';

export const runtime = 'nodejs';

interface PaddleSubscriptionPayload {
  id: string;
  customer_id: string;
  status: string;
  next_billed_at: string | null;
  scheduled_change: { action: string } | null;
  custom_data: { account_id?: string } | null;
  items: { price: { id: string }; quantity: number }[];
}

async function upsertFromSubscription(subscription: PaddleSubscriptionPayload) {
  const admin = getSupabaseServerAdminClient();
  const customerId = subscription.customer_id;

  // Résout le compte : custom_data (propagé depuis la transaction) en
  // priorité, sinon le customer Paddle déjà connu, sinon son email rapproché
  // d'un compte existant.
  let accountId = subscription.custom_data?.account_id;

  if (!accountId) {
    const { data } = await (admin as any)
      .from('billing_subscriptions')
      .select('account_id')
      .eq('paddle_customer_id', customerId)
      .maybeSingle();
    accountId = data?.account_id;
  }

  if (!accountId) {
    try {
      const customer = await getPaddleCustomer(customerId);
      const { data } = await (admin as any)
        .from('accounts')
        .select('id')
        .eq('email', customer.email)
        .maybeSingle();
      accountId = data?.id;
    } catch {
      // best-effort — si l'appel échoue, on log et on abandonne ci-dessous.
    }
  }

  if (!accountId) {
    console.warn('[billing/paddle/webhook] account_id introuvable pour', customerId);
    return;
  }

  const priceId = subscription.items[0]?.price?.id;
  const plan = priceId ? getPlanByPaddlePriceId(priceId)?.id ?? null : null;

  await (admin as any).from('billing_subscriptions').upsert(
    {
      account_id: accountId,
      paddle_customer_id: customerId,
      paddle_subscription_id: subscription.id,
      plan,
      status: subscription.status,
      quantity: subscription.items[0]?.quantity ?? 1,
      current_period_end: subscription.next_billed_at,
      cancel_at_period_end: subscription.scheduled_change?.action === 'cancel',
    },
    { onConflict: 'account_id' },
  );
}

export async function POST(request: NextRequest) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json({ error: 'Webhook non configuré' }, { status: 400 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('paddle-signature');

  if (!verifyPaddleSignature(rawBody, signature, secret)) {
    console.error('[billing/paddle/webhook] signature invalide');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as {
    event_type: string;
    data: PaddleSubscriptionPayload;
  };

  try {
    switch (event.event_type) {
      case 'subscription.created':
      case 'subscription.updated':
      case 'subscription.canceled':
        await upsertFromSubscription(event.data);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error('[billing/paddle/webhook] handler error', error);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
