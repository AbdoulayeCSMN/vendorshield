/**
 * POST /api/billing/portal
 * Ouvre le portail client Stripe (gestion de l'abonnement / facture / CB).
 */

import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { requireUser } from '@kit/supabase/require-user';

import { getStripe } from '~/lib/billing/stripe';

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseServerClient();
    const auth = await requireUser(client);

    if (auth.error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = auth.data.sub as string;

    const { data: subscription } = await (client as any)
      .from('billing_subscriptions')
      .select('stripe_customer_id')
      .eq('account_id', accountId)
      .maybeSingle();

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Aucun compte de facturation trouvé.' },
        { status: 404 },
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
      request.nextUrl.origin;

    const session = await getStripe().billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${siteUrl}/home/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[billing/portal]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Portal failed' },
      { status: 500 },
    );
  }
}
