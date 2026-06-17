/**
 * POST /api/alerts/webhook
 *
 * Reçoit les Database Webhooks Supabase déclenchés sur INSERT dans `alerts`
 * (toutes sources : manuelle, règles SQL, IA OSINT) et envoie une notification
 * email au compte concerné.
 *
 * Configuration (Supabase Dashboard → Database → Webhooks) :
 *   table   : public.alerts
 *   events  : INSERT
 *   url     : https://<domaine>/api/alerts/webhook
 *   header  : x-webhook-secret = <ALERTS_WEBHOOK_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { renderAlertEmail } from '~/lib/email/alert-template';
import { sendEmail } from '~/lib/email/resend.server';

export const runtime = 'nodejs';

interface AlertRecord {
  id: string;
  account_id: string;
  supplier_id: string | null;
  severity: string;
  title: string;
  message: string;
  status: string;
}

export async function POST(request: NextRequest) {
  const secret = process.env.ALERTS_WEBHOOK_SECRET;

  // Si un secret est configuré, on l'exige. (Sans secret configuré, l'endpoint
  // reste inactif côté sécurité — on refuse pour éviter tout abus public.)
  if (!secret) {
    return NextResponse.json(
      { error: 'Webhook non configuré (ALERTS_WEBHOOK_SECRET manquant)' },
      { status: 503 },
    );
  }

  if (request.headers.get('x-webhook-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: { type?: string; table?: string; record?: AlertRecord };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const alert = payload.record;
  if (payload.type !== 'INSERT' || payload.table !== 'alerts' || !alert) {
    return NextResponse.json({ ignored: true });
  }

  // On notifie uniquement les alertes significatives.
  if (alert.severity === 'info') {
    return NextResponse.json({ skipped: 'info-severity' });
  }

  try {
    const admin = getSupabaseServerAdminClient();

    const { data: account } = await (admin as any)
      .from('accounts')
      .select('email')
      .eq('id', alert.account_id)
      .maybeSingle();

    const recipient = account?.email as string | undefined;
    if (!recipient) {
      return NextResponse.json({ skipped: 'no-recipient-email' });
    }

    let supplierName: string | null = null;
    if (alert.supplier_id) {
      const { data: supplier } = await (admin as any)
        .from('suppliers')
        .select('name')
        .eq('id', alert.supplier_id)
        .maybeSingle();
      supplierName = (supplier?.name as string) ?? null;
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
      request.nextUrl.origin;

    const { subject, html } = renderAlertEmail({
      title: alert.title,
      message: alert.message,
      severity: alert.severity,
      supplierName,
      alertUrl: `${siteUrl}/home/alerts${alert.supplier_id ? `?supplier_id=${alert.supplier_id}` : ''}`,
    });

    const result = await sendEmail({ to: recipient, subject, html });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[alerts/webhook]', error);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }
}
