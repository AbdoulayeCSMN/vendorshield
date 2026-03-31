import { redirect } from 'next/navigation';

import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { withI18n } from '~/lib/i18n/with-i18n';
import { acceptInvitationAction } from '~/lib/vendorshield/actions/organization.actions';
import { InviteAcceptCard } from './_components/invite-accept-card';

interface Props {
  params: Promise<{ token: string }>;
}

async function InvitePage({ params }: Props) {
  const { token } = await params;
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);

  // Pas connecté → rediriger vers sign-in avec retour
  if (auth.error) {
    redirect(`/auth/sign-in?next=/invite/${token}`);
  }

  // Récupérer les infos de l'invitation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invitation } = await (client as any)
    .from('org_invitations')
    .select(`
      *,
      organization:organizations(id, name, industry, plan)
    `)
    .eq('token', token)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-900">Invitation invalide</p>
          <p className="text-sm text-gray-500 mt-1">
            Ce lien est expiré ou a déjà été utilisé.
          </p>
        </div>
      </div>
    );
  }

  return <InviteAcceptCard invitation={invitation} token={token} />;
}

export default withI18n(InvitePage);
