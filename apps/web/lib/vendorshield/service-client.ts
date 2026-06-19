import 'server-only';

import { createClient } from '@supabase/supabase-js';

/**
 * Client Supabase service-role (bypass RLS). À n'utiliser QUE côté serveur,
 * après une autorisation explicite (ex: possession d'un token de portail).
 */
export function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Configuration Supabase service-role manquante');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
