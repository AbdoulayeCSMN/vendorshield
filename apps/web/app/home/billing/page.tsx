import { PageBody, PageHeader } from '@kit/ui/page';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { withI18n } from '~/lib/i18n/with-i18n';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { isSuperAdmin } from '~/lib/billing/admin.server';
import { getSubscriptionForAccount } from '~/lib/billing/billing.server';

import { BankTransferLinkGenerator } from './_components/bank-transfer-link-generator';
import { BillingPlans } from './_components/billing-plans';
import { PaymentLinkGenerator } from './_components/payment-link-generator';

async function BillingPage() {
  const { t } = await createI18nServerInstance();
  const client = getSupabaseServerClient();
  const { data } = await client.auth.getClaims();
  const accountId = data?.claims?.sub as string | undefined;
  const email = data?.claims?.email as string | undefined;

  const subscription = accountId
    ? await getSubscriptionForAccount(accountId)
    : null;

  const showSalesTools = isSuperAdmin(email);

  return (
    <>
      <PageHeader
        title={t('pages.billing', { ns: 'vendorshield' })}
        description={t('pages.billingDesc', { ns: 'vendorshield' })}
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
