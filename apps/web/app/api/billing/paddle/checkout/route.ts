/**
 * POST /api/billing/paddle/checkout
 * Crée une transaction Paddle (abonnement) pour le compte courant et renvoie
 * l'URL de checkout hébergée à laquelle rediriger le client.
 * Body: { priceId: string }
 */

import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { requireUser } from '@kit/supabase/require-user';

import {
  createPaddleCustomer,
  createPaddleSubscriptionTransaction,
} from '~/lib/billing/paddle';

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

    if (!email) {
      return NextResponse.json(
        { error: 'Email du compte introuvable' },
        { status: 400 },
      );
    }

    const admin = getSupabaseServerAdminClient();

    // Réutilise le customer Paddle existant s'il y en a un.
    const { data: existing } = await (admin as any)
      .from('billing_subscriptions')
      .select('paddle_customer_id')
      .eq('account_id', accountId)
      .maybeSingle();

    let customerId: string | undefined = existing?.paddle_customer_id ?? undefined;

    if (!customerId) {
      const customer = await createPaddleCustomer(email, accountId);
      customerId = customer.id;

      await (admin as any).from('billing_subscriptions').upsert(
        { account_id: accountId, paddle_customer_id: customerId, status: 'incomplete' },
        { onConflict: 'account_id' },
      );
    }

    const siteUrl = getSiteUrl(request);

    const transaction = await createPaddleSubscriptionTransaction({
      priceId,
      customerId,
      accountId,
      returnUrl: `${siteUrl}/home/billing?status=success`,
    });

    return NextResponse.json({ url: transaction.checkout.url });
  } catch (error) {
    console.error('[billing/paddle/checkout]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Checkout failed' },
      { status: 500 },
    );
  }
}
