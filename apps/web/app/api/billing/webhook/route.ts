/**
 * POST /api/billing/webhook
 * Reçoit les événements Stripe et synchronise la table billing_subscriptions.
 *
 * Configurer dans Stripe Dashboard → Developers → Webhooks :
 *   endpoint: https://<domaine>/api/billing/webhook
 *   events:   checkout.session.completed,
 *             customer.subscription.created/updated/deleted
 */

import { NextRequest, NextResponse } from 'next/server';

import type Stripe from 'stripe';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { getPlanByPriceId } from '~/config/billing.config';
import { getStripe } from '~/lib/billing/stripe';

// Stripe exige le corps brut pour vérifier la signature.
export const runtime = 'nodejs';

interface AccountHint {
  // Présent quand le paiement vient d'un Payment Link partagé avec
  // `?client_reference_id=<accountId>` (lien généré pour un compte connu).
  accountId?: string;
  // Présent quand le paiement vient d'un Payment Link partagé avec
  // `?prefilled_email=` (vente assistée, prospect sans compte ouvert encore).
  email?: string;
}

async function upsertFromSubscription(
  subscription: Stripe.Subscription,
  hint?: AccountHint,
) {
  const admin = getSupabaseServerAdminClient();
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

  // Résout le compte : metadata Stripe en priorité, puis le hint du Payment
  // Link (client_reference_id), puis le customer Stripe déjà connu, puis en
  // dernier recours l'email du prospect rapproché d'un compte existant.
  let accountId = subscription.metadata?.account_id as string | undefined;

  if (!accountId) {
    accountId = hint?.accountId;
  }

  if (!accountId) {
    const { data } = await (admin as any)
      .from('billing_subscriptions')
      .select('account_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();
    accountId = data?.account_id;
  }

  if (!accountId && hint?.email) {
    const { data } = await (admin as any)
      .from('accounts')
      .select('id')
      .eq('email', hint.email)
      .maybeSingle();
    accountId = data?.id;
  }

  if (!accountId) {
    console.warn('[billing/webhook] account_id introuvable pour', customerId);
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id;
  const plan = priceId ? getPlanByPriceId(priceId)?.id ?? null : null;
  const periodEnd = (subscription as unknown as { current_period_end?: number })
    .current_period_end;

  await (admin as any).from('billing_subscriptions').upsert(
    {
      account_id: accountId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      plan,
      status: subscription.status,
      quantity: subscription.items.data[0]?.quantity ?? 1,
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    },
    { onConflict: 'account_id' },
  );
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: 'Webhook non configuré' },
      { status: 400 },
    );
  }

  const stripe = getStripe();
  const payload = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error('[billing/webhook] signature invalide', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            session.subscription as string,
          );
          await upsertFromSubscription(sub, {
            accountId: session.client_reference_id ?? undefined,
            email: session.customer_details?.email ?? session.customer_email ?? undefined,
          });
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await upsertFromSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error('[billing/webhook] handler error', error);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
