/**
 * POST/GET /api/ml/retrain
 *
 * Ré-entraînement planifié des prédictions opérationnelles pour TOUS les
 * comptes (cold-start global si historique insuffisant). Destiné à un cron
 * externe (Vercel Cron, GitHub Actions, pg_net…).
 *
 * Auth : `x-monitoring-secret` == MONITORING_SCAN_SECRET, ou Vercel Cron
 * (Authorization: Bearer CRON_SECRET).
 *
 * Vercel Cron (vercel.json) :
 *   { "crons": [{ "path": "/api/ml/retrain", "schedule": "30 5 * * *" }] }
 */

import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import {
  getGlobalBaselineModel,
  recomputeAccountPredictions,
} from '~/lib/vendorshield/predictions/batch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function authorized(request: NextRequest): boolean {
  const secret = process.env.MONITORING_SCAN_SECRET;
  const cronSecret = process.env.CRON_SECRET;
  if (secret && request.headers.get('x-monitoring-secret') === secret) return true;
  if (cronSecret && request.headers.get('authorization') === `Bearer ${cronSecret}`) return true;
  return false;
}

async function run(request: NextRequest) {
  if (!process.env.MONITORING_SCAN_SECRET && !process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'Ré-entraînement non configuré (MONITORING_SCAN_SECRET ou CRON_SECRET manquant)' },
      { status: 503 },
    );
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getSupabaseServerAdminClient();

  // Comptes ayant un historique de livraison.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (admin as any)
    .from('supplier_deliveries')
    .select('account_id')
    .limit(100000);
  const accountIds = [
    ...new Set(((rows ?? []) as { account_id: string }[]).map((r) => r.account_id).filter(Boolean)),
  ];

  const globalModel = await getGlobalBaselineModel();

  let accounts = 0;
  let suppliers = 0;
  for (const accountId of accountIds) {
    const n = await recomputeAccountPredictions(accountId, { client: admin, globalModel });
    if (n > 0) {
      accounts += 1;
      suppliers += n;
    }
  }

  return NextResponse.json({ ok: true, accounts, suppliers });
}

export async function POST(request: NextRequest) {
  return run(request);
}

export async function GET(request: NextRequest) {
  return run(request);
}
