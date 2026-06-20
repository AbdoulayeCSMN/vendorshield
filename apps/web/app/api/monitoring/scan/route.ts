/**
 * POST/GET /api/monitoring/scan
 *
 * Scan de surveillance GLOBAL (tous les comptes), destiné à un planificateur
 * externe (Vercel Cron, GitHub Actions, pg_net…). Insère des alertes
 * temporelles ; l'email part via le webhook `alerts`.
 *
 * Auth : en-tête `x-monitoring-secret` == MONITORING_SCAN_SECRET, ou bien le
 * header Vercel Cron `Authorization: Bearer <CRON_SECRET>`.
 *
 * Exemple Vercel Cron (vercel.json) :
 *   { "crons": [{ "path": "/api/monitoring/scan", "schedule": "0 6 * * *" }] }
 */

import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorized(request: NextRequest): boolean {
  const secret = process.env.MONITORING_SCAN_SECRET;
  const cronSecret = process.env.CRON_SECRET;

  if (secret && request.headers.get('x-monitoring-secret') === secret) return true;
  if (cronSecret && request.headers.get('authorization') === `Bearer ${cronSecret}`) return true;
  return false;
}

async function runScan(request: NextRequest) {
  if (!process.env.MONITORING_SCAN_SECRET && !process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'Scan non configuré (MONITORING_SCAN_SECRET ou CRON_SECRET manquant)' },
      { status: 503 },
    );
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getSupabaseServerAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any).rpc('run_monitoring_scan', {
    p_account_id: null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, created: (data as number) ?? 0 });
}

export async function POST(request: NextRequest) {
  return runScan(request);
}

// GET pour les planificateurs qui n'envoient pas de POST (ex: Vercel Cron).
export async function GET(request: NextRequest) {
  return runScan(request);
}
