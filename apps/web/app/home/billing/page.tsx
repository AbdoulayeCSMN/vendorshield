import { PageBody, PageHeader } from '@kit/ui/page';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { withI18n } from '~/lib/i18n/with-i18n';
import { getSubscriptionForAccount } from '~/lib/billing/billing.server';

import { BillingPlans } from './_components/billing-plans';

async function BillingPage() {
  const client = getSupabaseServerClient();
  const { data } = await client.auth.getClaims();
  const accountId = data?.claims?.sub as string | undefined;

  const subscription = accountId
    ? await getSubscriptionForAccount(accountId)
    : null;

  return (
    <>
      <PageHeader
        title="Abonnement & facturation"
        description="Choisissez le plan adapté à votre portefeuille fournisseurs."
      />
      <PageBody>
        <BillingPlans subscription={subscription} />
      </PageBody>
    </>
  );
}

export default withI18n(BillingPage);
