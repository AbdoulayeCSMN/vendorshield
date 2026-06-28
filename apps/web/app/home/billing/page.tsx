import { PageBody, PageHeader } from '@kit/ui/page';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { withI18n } from '~/lib/i18n/with-i18n';
import { isSuperAdmin } from '~/lib/billing/admin.server';
import { getSubscriptionForAccount } from '~/lib/billing/billing.server';

import { BankTransferLinkGenerator } from './_components/bank-transfer-link-generator';
import { BillingPlans } from './_components/billing-plans';
import { PaymentLinkGenerator } from './_components/payment-link-generator';

async function BillingPage() {
  const client = getSupabaseServerClient();
  const { data } = await client.auth.getClaims();
  const accountId = data?.claims?.sub as string | undefined;
  const email = data?.claims?.email as string | undefined;

  const subscription = accountId
    ? await getSubscriptionForAccount(accountId)
    : null;

  // Outils de vente assistée (lien à envoyer à un prospect) — réservés au
  // founder, pas affichés sur la page d'abonnement des clients.
  const showSalesTools = isSuperAdmin(email);

  return (
    <>
      <PageHeader
        title="Abonnement & facturation"
        description="Choisissez le plan adapté à votre portefeuille fournisseurs."
      />
      <PageBody className="flex flex-col gap-6">
        <BillingPlans subscription={subscription} />
        {showSalesTools ? (
          <>
            <BankTransferLinkGenerator />
            <PaymentLinkGenerator />
          </>
        ) : null}
      </PageBody>
    </>
  );
}

export default withI18n(BillingPage);
