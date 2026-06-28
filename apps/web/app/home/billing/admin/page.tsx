import { redirect } from 'next/navigation';

import { PageBody, PageHeader } from '@kit/ui/page';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { withI18n } from '~/lib/i18n/with-i18n';
import { isSuperAdmin } from '~/lib/billing/admin.server';

import { ManualActivationForm } from './_components/manual-activation-form';

async function BillingAdminPage() {
  const client = getSupabaseServerClient();
  const { data } = await client.auth.getClaims();
  const email = data?.claims?.email as string | undefined;

  if (!isSuperAdmin(email)) {
    redirect('/home/billing');
  }

  return (
    <>
      <PageHeader
        title="Activation manuelle"
        description="Réservé au founder — active un abonnement après réception d'un virement."
      />
      <PageBody>
        <ManualActivationForm />
      </PageBody>
    </>
  );
}

export default withI18n(BillingAdminPage);
