/**
 * POST /api/billing/paddle/portal
 * Ouvre le portail client Paddle (gestion de l'abonnement / facture / CB).
 */

import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { requireUser } from '@kit/supabase/require-user';

import { createPaddlePortalSession } from '~/lib/billing/paddle';

export async function POST(_request: NextRequest) {
  try {
    const client = getSupabaseServerClient();
    const auth = await requireUser(client);

    if (auth.error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = auth.data.sub as string;

    const { data: subscription } = await (client as any)
      .from('billing_subscriptions')
      .select('paddle_customer_id')
      .eq('account_id', accountId)
      .maybeSingle();

    if (!subscription?.paddle_customer_id) {
      return NextResponse.json(
        { error: 'Aucun compte de facturation trouvé.' },
        { status: 404 },
      );
    }

    const url = await createPaddlePortalSession(subscription.paddle_customer_id);

    return NextResponse.json({ url });
  } catch (error) {
    console.error('[billing/paddle/portal]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Portal failed' },
      { status: 500 },
    );
  }
}
