import { redirect } from 'next/navigation';

import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { withI18n } from '~/lib/i18n/with-i18n';
import { OnboardingWizard } from './_components/onboarding-wizard';

/**
 * /onboarding — Affiché quand un user authentifié n'a pas encore d'organisation.
 * Redirige vers /home si une organisation existe déjà.
 */
async function OnboardingPage() {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);

  if (auth.error) redirect('/auth/sign-in');

  // Vérifier si l'user a déjà une org
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (client as any)
    .from('org_members')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', auth.data.id)
    .eq('status', 'active');

  if (count && count > 0) {
    redirect('/home');
  }

  return <OnboardingWizard />;
}

export default withI18n(OnboardingPage);
