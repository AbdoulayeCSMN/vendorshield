import 'server-only';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export interface QuickStartStatus {
  suppliers: number;
  assessments: number;
  alertRules: number;
  /** true si l'utilisateur a complété les 3 étapes clés. */
  complete: boolean;
}

async function count(table: string): Promise<number> {
  const client = getSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (client as any)
    .from(table)
    .select('*', { count: 'exact', head: true });
  return count ?? 0;
}

/**
 * Statut du parcours de démarrage rapide (premier import guidé).
 * Les compteurs sont scoping par RLS sur le compte courant.
 */
export async function getQuickStartStatus(): Promise<QuickStartStatus> {
  const [suppliers, assessments, alertRules] = await Promise.all([
    count('suppliers'),
    count('risk_assessments'),
    count('alert_rules'),
  ]);

  return {
    suppliers,
    assessments,
    alertRules,
    complete: suppliers > 0 && assessments > 0 && alertRules > 0,
  };
}
