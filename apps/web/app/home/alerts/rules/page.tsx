import { PageBody, PageHeader } from '@kit/ui/page';
import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { getAlertRules } from '~/lib/vendorshield/alerts.server';
import { AlertRulesManager } from './_components/alert-rules-manager';

async function AlertRulesPage() {
  const { t } = await createI18nServerInstance();
  const rules = await getAlertRules();

  return (
    <>
      <PageHeader title={t('vendorshield:pages.alertRules')} description={<AppBreadcrumbs />} />
      <PageBody>
        <div className="max-w-3xl">
          <AlertRulesManager rules={rules} />
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(AlertRulesPage);
