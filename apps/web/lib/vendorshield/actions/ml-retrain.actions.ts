'use server';

import { revalidatePath } from 'next/cache';

import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { denyIfDemo } from '~/lib/vendorshield/demo';
import {
  getGlobalBaselineModel,
  recomputeAccountPredictions,
} from '~/lib/vendorshield/predictions/batch';

type RetrainResult =
  | { success: true; updated: number }
  | { success: false; error: string };

/**
 * Recalcule les prédictions opérationnelles de TOUS les fournisseurs du compte
 * courant (cold-start global si l'historique est insuffisant). Sans LLM :
 * rapide et gratuit. Le bouton « Recalculer tout » et le cron s'appuient dessus.
 */
export async function retrainPredictionsAction(): Promise<RetrainResult> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };

  const demo = await denyIfDemo();
  if (demo) return demo;

  const globalModel = await getGlobalBaselineModel();
  const updated = await recomputeAccountPredictions(auth.data.id, { client, globalModel });

  revalidatePath('/home');
  revalidatePath('/home/suppliers');
  return { success: true, updated };
}
