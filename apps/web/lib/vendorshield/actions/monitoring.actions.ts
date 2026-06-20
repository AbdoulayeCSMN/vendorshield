'use server';

import { revalidatePath } from 'next/cache';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

type ScanResult =
  | { success: true; created: number }
  | { success: false; error: string };

/**
 * Lance le scan de surveillance pour le compte de l'utilisateur courant.
 * Insère des alertes temporelles (docs/contrats expirants, évaluations
 * périmées) ; l'email part via le webhook `alerts`. Exécuté en admin (la
 * fonction SQL est SECURITY DEFINER mais réservée à service_role).
 */
export async function runMonitoringScanAction(): Promise<ScanResult> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };

  const admin = getSupabaseServerAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any).rpc('run_monitoring_scan', {
    p_account_id: auth.data.id,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath('/home/alerts');
  revalidatePath('/home');
  return { success: true, created: (data as number) ?? 0 };
}
