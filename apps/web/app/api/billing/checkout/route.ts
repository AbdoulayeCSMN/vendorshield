/**
 * POST /api/billing/checkout
 * Crée une session Stripe Checkout (mode abonnement) pour le compte courant.
 * Body: { priceId: string }
 */

import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { requireUser } from '@kit/supabase/require-user';

import { billingConfig } from '~/config/billing.config';
import { getStripe } from '~/lib/billing/stripe';

function getSiteUrl(request: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    request.nextUrl.origin
  );
}

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseServerClient();
    const auth = await requireUser(client);

    if (auth.error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = auth.data.sub as string;
    const email = (auth.data.email as string | undefined) ?? undefined;

    const { priceId } = await request.json();

    if (!priceId || typeof priceId !== 'string') {
      return NextResponse.json({ error: 'priceId requis' }, { status: 400 });
    }

    const stripe = getStripe();
    const admin = getSupabaseServerAdminClient();

    // Réutilise le customer Stripe existant s'il y en a un.
    const { data: existing } = await (admin as any)
      .from('billing_subscriptions')
      .select('stripe_customer_id')
      .eq('account_id', accountId)
      .maybeSingle();

    let customerId: string | undefined = existing?.stripe_customer_id ?? undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { account_id: accountId },
      });
      customerId = customer.id;

      await (admin as any)
        .from('billing_subscriptions')
        .upsert(
          { account_id: accountId, stripe_customer_id: customerId, status: 'incomplete' },
          { onConflict: 'account_id' },
        );
    }

    const siteUrl = getSiteUrl(request);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: billingConfig.trialDays,
        metadata: { account_id: accountId },
      },
      success_url: `${siteUrl}/home/billing?status=success`,
      cancel_url: `${siteUrl}/home/billing?status=cancelled`,
      metadata: { account_id: accountId },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[billing/checkout]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Checkout failed' },
      { status: 500 },
    );
  }
}
