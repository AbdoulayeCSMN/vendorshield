import { PageBody, PageHeader } from '@kit/ui/page';
import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { CopilotChat } from './_components/copilot-chat';

async function CopilotPage() {
  const { t } = await createI18nServerInstance();
  return (
    <>
      <PageHeader title={t('vendorshield:pages.copilot')} description={<AppBreadcrumbs />} />
      <PageBody>
        <CopilotChat />
      </PageBody>
    </>
  );
}

export default withI18n(CopilotPage);
