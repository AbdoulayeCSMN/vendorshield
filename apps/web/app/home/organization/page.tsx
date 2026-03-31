import { redirect } from 'next/navigation';

import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

/**
 * /home/organization — Redirige vers la première organisation de l'utilisateur.
 */
export default async function OrganizationIndexPage() {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);

  if (auth.error) redirect('/auth/sign-in');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from('org_members')
    .select('org_id')
    .eq('user_id', auth.data.id)
    .eq('status', 'active')
    .limit(1)
    .single();

  if (!data) redirect('/onboarding');

  redirect(`/home/organization/${data.org_id}`);
}
